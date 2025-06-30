import { Response, RequestHandler } from 'express';
import UserRequestInterface from '../interfaces/request.interface';
import { SessionService } from '../service/session.service';

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
    const response = await SessionService.createSession(userId, targetDomain);
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
  console.log(`[COOKIES] Request authenticated by Python script middleware`);
  
  if (!encryptedCookies) {
    console.log('[COOKIES] Missing encryptedCookies in request body');
    res.status(400).json({ error: 'encryptedCookies is required' });
    return;
  }

  try {
    await SessionService.storeSessionCookies(parseInt(id), encryptedCookies);
    console.log(`[COOKIES] Successfully stored cookies for session: ${id}`);
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[COOKIES] Error storing session cookies:', error);
    console.error('[COOKIES] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    
    if (error.message === 'Session not found') {
      res.status(404).json({ error: 'Session not found' });
    } else {
      res.status(500).json({ error: 'Failed to store cookies', details: error.message });
    }
  }
};

// GET /api/session/:id/cookies
export const getSessionCookies: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  
  console.log(`[COOKIES] User ${userId} retrieving cookies for session: ${id}`);

  try {
    // Check if user owns the session
    const isOwner = await SessionService.checkSessionOwnership(Number(id), Number(userId));
    if (!isOwner) {
      console.log(`[COOKIES] User ${userId} attempted to retrieve cookies for session ${id} they don't own`);
      res.status(403).json({ error: 'Access denied: You can only view cookies from your own sessions' });
      return;
    }

    console.log(`[COOKIES] User ${userId} authorized to retrieve cookies for session ${id}`);
    const decryptedCookies = await SessionService.getSessionCookies(parseInt(id));
    res.status(200).json({ decryptedCookies });
  } catch (error: any) {
    console.error('[COOKIES] Error retrieving session cookies:', error);
    console.error('[COOKIES] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    
    if (error.message === 'Session not found' || error.message === 'No cookies found for this session') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to retrieve cookies', details: error.message });
    }
  }
};

// POST /api/session/terminate-all (Admin only)
export const terminateAllSessions: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  console.log('[SESSION] Admin terminating all active sessions');

  try {
    const terminatedCount = await SessionService.terminateAllSessions();
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
    const terminatedCount = await SessionService.terminateUserSessions(parseInt(userId));
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
    const sessions = await SessionService.getAllSessions();
    res.status(200).json({ 
      success: true, 
      sessions 
    });
  } catch (error: any) {
    console.error('[SESSION] Error fetching all sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message });
  }
};

// GET /api/session/my-sessions (Current user)
export const getCurrentUserSessions: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  const userId = req.user?.id;
  console.log('[SESSION] User requesting their sessions, userId:', userId);
  
  if (!userId) {
    console.log('[SESSION] No user ID found in request');
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }
  
  try {
    const sessions = await SessionService.getCurrentUserSessions(Number(userId));
    res.status(200).json({ 
      success: true, 
      sessions 
    });
  } catch (error: any) {
    console.error('[SESSION] Error fetching user sessions:', error);
    res.status(500).json({ error: 'Failed to fetch user sessions', details: error.message });
  }
};

// POST /api/session/:id/terminate (Admin only)
export const terminateSession: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  const { id } = req.params;
  console.log(`[SESSION] Admin terminating session: ${id}`);
  
  try {
    await SessionService.terminateSession(parseInt(id));
    res.status(200).json({ 
      success: true, 
      message: `Session ${id} terminated successfully`
    });
  } catch (error: any) {
    console.error(`[SESSION] Error terminating session ${id}:`, error);
    
    if (error.message === 'Session not found') {
      res.status(404).json({ error: 'Session not found' });
    } else {
      res.status(500).json({ error: 'Failed to terminate session', details: error.message });
    }
  }
};

// POST /api/session/:id/extract-cookies
export const extractCookiesForSession: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  
  console.log(`[SESSION] User ${userId} requesting cookie extraction for session: ${id}`);

  try {
    // Check if user owns the session
    const isOwner = await SessionService.checkSessionOwnership(Number(id), Number(userId));
    if (!isOwner) {
      console.log(`[SESSION] User ${userId} attempted to extract cookies for session ${id} they don't own`);
      res.status(403).json({ error: 'Access denied: You can only extract cookies from your own sessions' });
      return;
    }

    console.log(`[SESSION] User ${userId} authorized to extract cookies for session ${id}`);
    await SessionService.extractCookiesForSession(Number(id));
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[SESSION] Error extracting cookies:', error);
    
    if (error.message === 'Session or container not found') {
      res.status(404).json({ error: 'Session not found' });
    } else {
      res.status(500).json({ error: 'Failed to extract cookies', details: error.message });
    }
  }
};

/**
 * Start the session cleanup job
 */
export function startSessionCleanupJob(): void {
  console.log('[SESSION_CONTROLLER] Starting session cleanup job, running every minute');
  setInterval(() => {
    SessionService.cleanupExpiredSessions().catch(error => {
      console.error('[SESSION_CONTROLLER] Error in cleanup job:', error);
    });
  }, 60 * 1000); // Run every minute
} 