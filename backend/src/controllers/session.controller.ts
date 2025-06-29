import { Request, Response, RequestHandler } from 'express';
import Docker from 'dockerode';
import { Session, SessionStatus, sequelize, User } from '../models';
import UserRequestInterface from '../interfaces/request.interface';

const docker = new Docker();

// POST /session
export const createSession: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  const { userId, targetDomain } = req.body;
  console.log(`[SESSION] Creating session for userId: ${userId}, targetDomain: ${targetDomain}`);
  
  if (!userId || !targetDomain) {
    console.log('[SESSION] Missing required fields:', { userId, targetDomain });
    res.status(400).json({ error: 'userId and targetDomain are required' });
    return;
  }

  try {
    console.log('[SESSION] Checking if browser-session image exists...');
    // Check if image exists
    const images = await docker.listImages({ filters: { reference: ['browser-session'] } });
    console.log('[SESSION] Found images:', images.length);
    
    if (images.length === 0) {
      console.log('[SESSION] Image not found');
      res.status(500).json({ 
        error: 'browser-session Docker image not found. Please build it first using: docker build -f backend/browser-session.Dockerfile -t browser-session backend/',
        details: 'The browser-session image needs to be built manually before creating sessions.'
      });
      return;
    }

    console.log('[SESSION] Creating database session entry...');
    // Create DB session entry (status: pending)
    const session = await Session.create({
      userId,
      targetDomain,
      status: SessionStatus.PENDING,
    });
    console.log('[SESSION] Database session created with ID:', session.id);

    console.log('[SESSION] Creating Docker container...');
    // Launch Docker container
    const container = await docker.createContainer({
      Image: 'browser-session',
      Tty: true,
      ExposedPorts: {
        '5901/tcp': {},
        '6080/tcp': {},
      },
      HostConfig: {
        PortBindings: {
          '5901/tcp': [{ HostPort: '' }], // Let Docker assign a random port
          '6080/tcp': [{ HostPort: '' }],
        },
        AutoRemove: true,
      },
      Env: [
        `TARGET_DOMAIN=${targetDomain}`,
        `SESSION_ID=${session.id}`,
      ],
    });
    console.log('[SESSION] Container created with ID:', container.id);

    console.log('[SESSION] Starting container...');
    await container.start();
    console.log('[SESSION] Container started successfully');

    // Wait a bit for the container to fully initialize
    console.log('[SESSION] Waiting for container to initialize...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('[SESSION] Inspecting container for port mappings...');
    // Inspect to get host ports
    const data = await container.inspect();
    console.log('[SESSION] Container inspection data:', JSON.stringify(data.NetworkSettings.Ports, null, 2));
    
    const vncPortBinding = data.NetworkSettings.Ports['5901/tcp'];
    const novncPortBinding = data.NetworkSettings.Ports['6080/tcp'];
    
    if (!vncPortBinding || !vncPortBinding[0] || !novncPortBinding || !novncPortBinding[0]) {
      console.error('[SESSION] Port mappings not found:', { vncPortBinding, novncPortBinding });
      res.status(500).json({ 
        error: 'Container created but port mappings failed',
        details: 'VNC or noVNC ports not properly assigned'
      });
      return;
    }
    
    const vncPort = vncPortBinding[0].HostPort;
    const novncPort = novncPortBinding[0].HostPort;
    console.log('[SESSION] Port mappings - VNC:', vncPort, 'noVNC:', novncPort);

    console.log('[SESSION] Updating session with container info...');
    // Update session with containerId and status
    session.containerId = container.id;
    session.status = SessionStatus.ACTIVE;
    await session.save();
    console.log('[SESSION] Session updated successfully');

    const response = {
      sessionId: session.id,
      vncPort,
      novncPort,
      containerId: container.id,
      novncUrl: `/vnc.html?host=localhost&port=${novncPort}`,
    };
    console.log('[SESSION] Sending success response:', response);
    res.status(201).json(response);
  } catch (error: any) {
    console.error('[SESSION] Error creating session:', error);
    console.error('[SESSION] Error stack:', error.stack);
    console.error('[SESSION] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
    });
    
    // Try to provide more specific error messages
    let errorMessage = 'Failed to create session';
    if (error.code === 'ENOENT') {
      errorMessage = 'Docker not found or not accessible';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to Docker daemon';
    } else if (error.message?.includes('image')) {
      errorMessage = 'Docker image issue: ' + error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: error.message,
      code: error.code 
    });
  }
};

// POST /api/session/:id/cookies
export const storeSessionCookies: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { encryptedCookies } = req.body;
  console.log(`[COOKIES] Storing cookies for session: ${id}`);
  
  if (!encryptedCookies) {
    console.log('[COOKIES] Missing encryptedCookies in request body');
    res.status(400).json({ error: 'encryptedCookies is required' });
    return;
  }
  try {
    console.log('[COOKIES] Finding session in database...');
    const session = await Session.findByPk(id);
    if (!session) {
      console.log('[COOKIES] Session not found:', id);
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    console.log('[COOKIES] Session found, updating with cookies...');
    session.encryptedCookies = encryptedCookies;
    session.status = SessionStatus.COMPLETED;
    await session.save();
    console.log('[COOKIES] Session updated successfully');

    // Stop and remove the associated container
    if (session.containerId) {
      console.log('[COOKIES] Cleaning up container:', session.containerId);
      try {
        const container = docker.getContainer(session.containerId);
        await container.stop({ t: 5 });
        await container.remove({ force: true });
        console.log('[COOKIES] Container cleaned up successfully');
      } catch (e: any) {
        // Handle case where container is already being removed
        if (e.statusCode === 409 && e.json?.message?.includes('removal of container') && e.json?.message?.includes('is already in progress')) {
          console.log('[COOKIES] Container already being removed, skipping cleanup');
        } else {
          console.error('[COOKIES] Error cleaning up container:', e);
        }
        session.status = SessionStatus.DESTROYED;
        await session.save();
      }
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[COOKIES] Error storing session cookies:', error);
    console.error('[COOKIES] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to store cookies', details: error.message });
  }
};

// GET /api/session/:id/cookies
export const getSessionCookies: RequestHandler = async (req, res) => {
  const { id } = req.params;
  console.log(`[COOKIES] Retrieving cookies for session: ${id}`);
  
  try {
    console.log('[COOKIES] Finding session in database...');
    const session = await Session.findByPk(id);
    if (!session) {
      console.log('[COOKIES] Session not found:', id);
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (!session.encryptedCookies) {
      console.log('[COOKIES] No cookies found for session:', id);
      res.status(404).json({ error: 'No cookies found for this session' });
      return;
    }
    console.log('[COOKIES] Cookies found, returning...');
    res.status(200).json({ encryptedCookies: session.encryptedCookies });
  } catch (error: any) {
    console.error('[COOKIES] Error retrieving session cookies:', error);
    console.error('[COOKIES] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to retrieve cookies', details: error.message });
  }
};

// POST /api/session/terminate-all (Admin only)
export const terminateAllSessions: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  console.log('[SESSION] Admin terminating all active sessions');

  try {
    console.log('[SESSION] Finding all active sessions...');
    const activeSessions = await Session.findAll({
      where: {
        status: [SessionStatus.PENDING, SessionStatus.ACTIVE],
      },
    });
    console.log(`[SESSION] Found ${activeSessions.length} active sessions`);

    let terminatedCount = 0;
    for (const session of activeSessions) {
      if (session.containerId) {
        try {
          console.log(`[SESSION] Terminating container: ${session.containerId}`);
          const container = docker.getContainer(session.containerId);
          await container.stop({ t: 5 });
          await container.remove({ force: true });
          console.log(`[SESSION] Container ${session.containerId} terminated`);
        } catch (e) {
          console.error(`[SESSION] Error terminating container ${session.containerId}:`, e);
        }
      }
      session.status = SessionStatus.DESTROYED;
      await session.save();
      terminatedCount++;
    }

    console.log(`[SESSION] Successfully terminated ${terminatedCount} sessions`);
    res.status(200).json({ 
      success: true, 
      message: `Terminated ${terminatedCount} active sessions`,
      terminatedCount 
    });
  } catch (error: any) {
    console.error('[SESSION] Error terminating all sessions:', error);
    res.status(500).json({ error: 'Failed to terminate sessions', details: error.message });
  }
};

// POST /api/session/terminate-user/:userId (Admin or user themselves)
export const terminateUserSessions: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  const { userId } = req.params;
  
  console.log(`[SESSION] Terminating sessions for user ${userId}`);

  try {
    console.log(`[SESSION] Finding active sessions for user ${userId}...`);
    const userSessions = await Session.findAll({
      where: {
        userId: parseInt(userId),
        status: [SessionStatus.PENDING, SessionStatus.ACTIVE],
      },
    });
    console.log(`[SESSION] Found ${userSessions.length} active sessions for user ${userId}`);

    let terminatedCount = 0;
    for (const session of userSessions) {
      if (session.containerId) {
        try {
          console.log(`[SESSION] Terminating container: ${session.containerId}`);
          const container = docker.getContainer(session.containerId);
          await container.stop({ t: 5 });
          await container.remove({ force: true });
          console.log(`[SESSION] Container ${session.containerId} terminated`);
        } catch (e) {
          console.error(`[SESSION] Error terminating container ${session.containerId}:`, e);
        }
      }
      session.status = SessionStatus.DESTROYED;
      await session.save();
      terminatedCount++;
    }

    console.log(`[SESSION] Successfully terminated ${terminatedCount} sessions for user ${userId}`);
    res.status(200).json({ 
      success: true, 
      message: `Terminated ${terminatedCount} active sessions for user ${userId}`,
      terminatedCount 
    });
  } catch (error: any) {
    console.error('[SESSION] Error terminating user sessions:', error);
    res.status(500).json({ error: 'Failed to terminate user sessions', details: error.message });
  }
};

// GET /api/session (Admin only)
export const getAllSessions: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  console.log('[SESSION] Admin requesting all sessions');
  
  try {
    console.log('[SESSION] Finding all sessions...');
    const sessions = await Session.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    console.log(`[SESSION] Found ${sessions.length} sessions`);

    res.status(200).json({ 
      success: true, 
      sessions: sessions.map(session => ({
        id: session.id,
        userId: session.userId,
        username: session.user?.username || 'Unknown User',
        targetDomain: session.targetDomain,
        status: session.status,
        containerId: session.containerId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }))
    });
  } catch (error: any) {
    console.error('[SESSION] Error fetching all sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message });
  }
};

// POST /api/session/:id/terminate (Admin only)
export const terminateSession: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  const { id } = req.params;
  console.log(`[SESSION] Admin terminating session: ${id}`);
  
  try {
    console.log(`[SESSION] Finding session ${id}...`);
    const session = await Session.findByPk(id);
    if (!session) {
      console.log(`[SESSION] Session ${id} not found`);
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.containerId) {
      try {
        console.log(`[SESSION] Terminating container: ${session.containerId}`);
        const container = docker.getContainer(session.containerId);
        await container.stop({ t: 5 });
        await container.remove({ force: true });
        console.log(`[SESSION] Container ${session.containerId} terminated`);
      } catch (e) {
        console.error(`[SESSION] Error terminating container ${session.containerId}:`, e);
      }
    }

    session.status = SessionStatus.DESTROYED;
    await session.save();
    console.log(`[SESSION] Session ${id} terminated successfully`);

    res.status(200).json({ 
      success: true, 
      message: `Session ${id} terminated successfully`
    });
  } catch (error: any) {
    console.error(`[SESSION] Error terminating session ${id}:`, error);
    res.status(500).json({ error: 'Failed to terminate session', details: error.message });
  }
}; 