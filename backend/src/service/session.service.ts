import { Session, SessionStatus, User } from '../models';
import { DockerService } from './docker.service';
import { decryptCookies } from '../utils/crypto.helper';

export class SessionService {
  private static SESSION_TIMEOUT_MINUTES = 8;

  /**
   * Require a session by ID, throw if not found
   */
  private static async requireSession(sessionId: number): Promise<any> {
    const session = await Session.findByPk(sessionId);
    if (!session) throw new Error('Session not found');
    return session;
  }

  /**
   * Require a session by ID with a container, throw if not found or no containerId
   */
  private static async requireSessionWithContainer(sessionId: number): Promise<any> {
    const session = await Session.findByPk(sessionId);
    if (!session || !session.containerId) throw new Error('Session or container not found');
    return session;
  }

  /**
   * Helper method to update session status
   */
  private static async updateSessionStatus(session: any, status: SessionStatus): Promise<void> {
    session.status = status;
    await session.save();
    console.log(`[SESSION_SERVICE] Session ${session.id} status updated to: ${status}`);
  }

  /**
   * Helper method to terminate container and update session status
   */
  private static async terminateContainerAndUpdateStatus(session: any, finalStatus: SessionStatus = SessionStatus.DESTROYED): Promise<void> {
    if (session.containerId) {
      try {
        await DockerService.terminateContainer(session.containerId);
      } catch (e: any) {
        console.error(`[SESSION_SERVICE] Error terminating container ${session.containerId}:`, e);
        // Continue with status update even if container termination fails
      }
    }
    await this.updateSessionStatus(session, finalStatus);
  }

  /**
   * Helper method to find sessions by status
   */
  private static async findSessionsByStatus(statuses: SessionStatus[], userId?: number): Promise<any[]> {
    const whereClause: any = { status: statuses };
    if (userId) {
      whereClause.userId = userId;
    }
    
    return await Session.findAll({ where: whereClause });
  }

  /**
   * Helper method to check if a user owns a session
   */
  static async checkSessionOwnership(sessionId: number, userId: number): Promise<boolean> {
    const session = await this.requireSession(sessionId);
    return session.userId === userId;
  }

  /**
   * Create a new browser session
   */
  static async createSession(userId: number, targetDomain: string): Promise<{
    sessionId: number;
    vncPort: string;
    novncPort: string;
    containerId: string;
    novncUrl: string;
  }> {
    console.log('[SESSION_SERVICE] Creating session for userId:', userId, 'targetDomain:', targetDomain);
    
    const imageExists = await DockerService.checkImageExists('browser-session');
    
    if (!imageExists) {
      console.log('[SESSION_SERVICE] Image not found');
      throw new Error('browser-session Docker image not found. Please build it first using: docker build -f backend/browser-session.Dockerfile -t browser-session backend/');
    }

    console.log('[SESSION_SERVICE] Creating database session entry...');
    const session = await Session.create({
      userId,
      targetDomain,
      status: SessionStatus.PENDING,
    });
    console.log('[SESSION_SERVICE] Database session created with ID:', session.id);

    console.log('[SESSION_SERVICE] Creating Docker container...');
    const containerInfo = await DockerService.createBrowserSessionContainer();
    console.log('[SESSION_SERVICE] Container created successfully');

    console.log('[SESSION_SERVICE] Updating session with container info...');
    session.containerId = containerInfo.containerId;
    await this.updateSessionStatus(session, SessionStatus.ACTIVE);
    console.log('[SESSION_SERVICE] Session updated successfully');

    const response = {
      sessionId: session.id,
      vncPort: containerInfo.vncPort,
      novncPort: containerInfo.novncPort,
      containerId: containerInfo.containerId,
      novncUrl: `/vnc.html?host=localhost&port=${containerInfo.novncPort}`,
    };
    console.log('[SESSION_SERVICE] Session creation completed:', response);
    return response;
  }

  /**
   * Store cookies for a session
   */
  static async storeSessionCookies(sessionId: number, encryptedCookies: string): Promise<void> {
    console.log('[SESSION_SERVICE] Storing cookies for session:', sessionId);
    
    const session = await this.requireSession(sessionId);

    console.log('[SESSION_SERVICE] Session found, updating with cookies...');
    session.encryptedCookies = encryptedCookies;
    await this.updateSessionStatus(session, SessionStatus.COMPLETED);
    console.log('[SESSION_SERVICE] Session updated successfully');

    if (session.containerId) {
      try {
        await DockerService.terminateContainer(session.containerId);
      } catch (e: any) {
        console.error('[SESSION_SERVICE] Error cleaning up container:', e);
        await this.updateSessionStatus(session, SessionStatus.DESTROYED);
      }
    }
  }

  /**
   * Get cookies for a session
   */
  static async getSessionCookies(sessionId: number): Promise<string> {
    console.log('[SESSION_SERVICE] Retrieving cookies for session:', sessionId);
    
    console.log('[SESSION_SERVICE] Finding session in database...');
    const session = await this.requireSession(sessionId);
    
    if (!session.encryptedCookies) {
      console.log('[SESSION_SERVICE] No cookies found for session:', sessionId);
      throw new Error('No cookies found for this session');
    }
    console.log('[SESSION_SERVICE] Cookies found, returning...');
    return decryptCookies(session.encryptedCookies);
  }

  /**
   * Terminate all active sessions
   */
  static async terminateAllSessions(): Promise<number> {
    console.log('[SESSION_SERVICE] Terminating all active sessions');

    console.log('[SESSION_SERVICE] Finding all active sessions...');
    const activeSessions = await this.findSessionsByStatus([SessionStatus.PENDING, SessionStatus.ACTIVE]);
    console.log('[SESSION_SERVICE] Found', activeSessions.length, 'active sessions');

    let terminatedCount = 0;
    for (const session of activeSessions) {
      await this.terminateContainerAndUpdateStatus(session);
      terminatedCount++;
    }

    console.log('[SESSION_SERVICE] Successfully terminated', terminatedCount, 'sessions');
    return terminatedCount;
  }

  /**
   * Terminate all sessions for a specific user
   */
  static async terminateUserSessions(userId: number): Promise<number> {
    console.log('[SESSION_SERVICE] Terminating sessions for user:', userId);

    console.log('[SESSION_SERVICE] Finding active sessions for user', userId, '...');
    const userSessions = await this.findSessionsByStatus([SessionStatus.PENDING, SessionStatus.ACTIVE], userId);
    console.log('[SESSION_SERVICE] Found', userSessions.length, 'active sessions for user', userId);

    let terminatedCount = 0;
    for (const session of userSessions) {
      await this.terminateContainerAndUpdateStatus(session);
      terminatedCount++;
    }

    console.log('[SESSION_SERVICE] Successfully terminated', terminatedCount, 'sessions for user', userId);
    return terminatedCount;
  }

  /**
   * Get all sessions with user information
   */
  static async getAllSessions(): Promise<Array<{
    id: number;
    userId: number;
    username: string;
    targetDomain: string;
    status: SessionStatus;
    containerId: string | null;
    hasCookies: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    console.log('[SESSION_SERVICE] Getting all sessions');
    
    console.log('[SESSION_SERVICE] Finding all sessions...');
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
    console.log('[SESSION_SERVICE] Found', sessions.length, 'sessions');

    return sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      username: session.user?.username || 'Unknown User',
      targetDomain: session.targetDomain,
      status: session.status,
      containerId: session.containerId,
      hasCookies: !!session.encryptedCookies,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
  }

  /**
   * Get sessions for the current user
   */
  static async getCurrentUserSessions(userId: number): Promise<Array<{
    id: number;
    targetDomain: string;
    status: SessionStatus;
    containerId: string | null;
    hasCookies: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    console.log('[SESSION_SERVICE] Getting sessions for user:', userId);
    
    console.log('[SESSION_SERVICE] Finding sessions for user', userId, '...');
    const sessions = await Session.findAll({
      where: {
        userId: userId,
      },
      order: [['createdAt', 'DESC']],
    });
    console.log('[SESSION_SERVICE] Found', sessions.length, 'sessions for user', userId);

    return sessions.map(session => ({
      id: session.id,
      targetDomain: session.targetDomain,
      status: session.status,
      containerId: session.containerId,
      hasCookies: !!session.encryptedCookies,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
  }

  /**
   * Terminate a specific session
   */
  static async terminateSession(sessionId: number): Promise<void> {
    console.log('[SESSION_SERVICE] Terminating session:', sessionId);
  
    const session = await this.requireSession(sessionId);

    await this.terminateContainerAndUpdateStatus(session);
    console.log('[SESSION_SERVICE] Session', sessionId, 'terminated successfully');
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - this.SESSION_TIMEOUT_MINUTES * 60 * 1000);
    console.log('[SESSION_SERVICE] Cleaning up sessions older than:', cutoff);
    
    const expiredSessions = await Session.findAll({
      where: {
        status: [SessionStatus.PENDING, SessionStatus.ACTIVE],
        createdAt: { [require('sequelize').Op.lt]: cutoff },
      },
    });
    
    console.log('[SESSION_SERVICE] Found', expiredSessions.length, 'expired sessions');
    
    for (const session of expiredSessions) {
      await this.terminateContainerAndUpdateStatus(session);
    }
  }

  /**
   * Trigger cookie extraction in the session's container
   */
  static async extractCookiesForSession(sessionId: number): Promise<void> {
    const session = await this.requireSessionWithContainer(sessionId);
    
    // Set status to TERMINATING
    await this.updateSessionStatus(session, SessionStatus.TERMINATING);
    
    try {
      // Execute the cookie extraction script in the container with arguments
      await DockerService.execInContainer(session.containerId, [
        'python3', 
        '/usr/local/bin/cookie_extractor.py',
        '--target-domain', session.targetDomain,
        '--session-id', sessionId.toString(),
        '--backend-url', 'http://host.docker.internal:3000'
      ]);
      
      // Update status to COMPLETED (container termination will be handled by storeSessionCookies)
      await this.updateSessionStatus(session, SessionStatus.COMPLETED);
    } catch (error) {
      console.error('[SESSION_SERVICE] Error during cookie extraction:', error);
      
      // If cookie extraction fails, we still need to terminate the container
      try {
        await DockerService.terminateContainer(session.containerId);
        console.log('[SESSION_SERVICE] Container terminated after failed cookie extraction');
      } catch (terminateError) {
        console.error('[SESSION_SERVICE] Error terminating container after failed extraction:', terminateError);
      }
      
      await this.updateSessionStatus(session, SessionStatus.FAILED);
      throw error;
    }
  }
} 