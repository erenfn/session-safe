import { Session, SessionStatus, User } from '../models';
import { DockerService } from './docker.service';
import { decryptCookies } from '../utils/crypto.helper';
import { Logger } from '../utils/logger.helper';

export class SessionService {
  private static SESSION_TIMEOUT_MINUTES = 8;

  /**
   * Require a session by ID, throw if not found
   */
  private static async requireSession(sessionId: number): Promise<any> {
    const session = await Session.findByPk(sessionId);
    if (!session) {
      Logger.error('[SESSION_SERVICE] Session not found for sessionId:', sessionId);
      throw new Error('Session not found');
    }
    return session;
  }

  /**
   * Require a session by ID with a container, throw if not found or no containerId
   */
  private static async requireSessionWithContainer(sessionId: number): Promise<any> {
    const session = await Session.findByPk(sessionId);
    if (!session || !session.containerId) {
      Logger.error('[SESSION_SERVICE] Session or container not found for sessionId:', sessionId);
      throw new Error('Session or container not found');
    }
    return session;
  }

  /**
   * Helper method to update session status
   */
  private static async updateSessionStatus(session: any, status: SessionStatus): Promise<void> {
    session.status = status;
    await session.save();
    Logger.info(`[SESSION_SERVICE] Session ${session.id} status updated to: ${status}`);
  }

  /**
   * Helper method to terminate container and update session status
   */
  private static async terminateContainerAndUpdateStatus(session: any, finalStatus: SessionStatus = SessionStatus.DESTROYED): Promise<void> {
    if (session.containerId) {
      try {
        await DockerService.terminateContainer(session.containerId);
      } catch (e: any) {
        Logger.error(`[SESSION_SERVICE] Error terminating container ${session.containerId}:`, e);
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

  static async hasActiveSession(userId: number): Promise<boolean> {
    const activeSessions = await this.findSessionsByStatus([SessionStatus.PENDING, SessionStatus.ACTIVE], userId);
    return activeSessions.length > 0;
  }

  static async getActiveSessionInfo(userId: number): Promise<{ sessionId: number; novncUrl: string | null } | null> {
    const activeSessions = await this.findSessionsByStatus([SessionStatus.PENDING, SessionStatus.ACTIVE], userId);

    if (activeSessions.length === 0) {
      return null;
    }

    const session = activeSessions[0];
    
    // If no containerId, return basic session info
    if (!session.containerId) {
      return {
        sessionId: session.id,
        novncUrl: null, // Indicate that the session exists but container is missing
      };
    }

    try {
      const ports = await DockerService.getContainerPorts(session.containerId);
      
      if (!ports.novncPort) {
        // Return session info even if port is missing
        Logger.info(`[SESSION_SERVICE] No noVNC port found for session ${session.id}`);
        return {
          sessionId: session.id,
          novncUrl: null, // Indicate that the session exists but port is missing
        };
      }

      const backendHost = process.env.BACKEND_HOST || 'localhost';
      const vncPassword = process.env.VNC_PASSWORD || 'password';
      const novncUrl = `http://${backendHost}:${ports.novncPort}/vnc.html?autoconnect=true&password=${vncPassword}`;
      
      return {
        sessionId: session.id,
        novncUrl: novncUrl,
      };
    } catch (error) {
      Logger.error(`[SESSION_SERVICE] Error getting active session details for session ${session.id}:`, error);
      // Return session info even if there's an error getting ports
      return {
        sessionId: session.id,
        novncUrl: null, // Indicate that the session exists but there was an error
      };
    }
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
    const imageExists = await DockerService.checkImageExists('browser-session');

    if (!imageExists) {
      Logger.error('[SESSION_SERVICE] Image not found');
      throw new Error('browser-session Docker image not found. Please build it first using: docker build -f backend/browser-session.Dockerfile -t browser-session backend/');
    }

    const session = await Session.create({
      userId,
      targetDomain,
      status: SessionStatus.PENDING,
    });
    Logger.info('[SESSION_SERVICE] Database session created with ID:', session.id, 'for userId:', userId);

    const containerInfo = await DockerService.createBrowserSessionContainer();

    session.containerId = containerInfo.containerId;
    await this.updateSessionStatus(session, SessionStatus.ACTIVE);

    const backendHost = process.env.BACKEND_HOST || 'localhost';
    const response = {
      sessionId: session.id,
      vncPort: containerInfo.vncPort,
      novncPort: containerInfo.novncPort,
      containerId: containerInfo.containerId,
      novncUrl: `http://${backendHost}:${containerInfo.novncPort}/vnc.html?autoconnect=true&password=${process.env.VNC_PASSWORD || 'password'}`,
    };
    Logger.info('[SESSION_SERVICE] Session creation completed:', response);
    return response;
  }

  /**
   * Store cookies for a session
   */
  static async storeSessionCookies(sessionId: number, encryptedCookies: string): Promise<void> {
    Logger.info('[SESSION_SERVICE] Storing cookies for session:', sessionId);

    const session = await this.requireSession(sessionId);
    session.encryptedCookies = encryptedCookies;
    await this.updateSessionStatus(session, SessionStatus.COMPLETED);

    if (session.containerId) {
      try {
        await DockerService.terminateContainer(session.containerId);
      } catch (e: any) {
        Logger.error('[SESSION_SERVICE] Error cleaning up container:', e);
        await this.updateSessionStatus(session, SessionStatus.DESTROYED);
      }
    }
  }

  /**
   * Get cookies for a session
   */
  static async getSessionCookies(sessionId: number): Promise<string> {
    Logger.info('[SESSION_SERVICE] Retrieving cookies for session:', sessionId);

    const session = await this.requireSession(sessionId);

    if (!session.encryptedCookies) {
      Logger.info('[SESSION_SERVICE] No cookies found for session:', sessionId);
      throw new Error('No cookies found for this session');
    }
    return decryptCookies(session.encryptedCookies);
  }

  /**
   * Terminate all active sessions
   */
  static async terminateAllSessions(): Promise<number> {
    Logger.info('[SESSION_SERVICE] Terminating all active sessions');

    const activeSessions = await this.findSessionsByStatus([SessionStatus.PENDING, SessionStatus.ACTIVE]);
    Logger.info('[SESSION_SERVICE] Found', activeSessions.length, 'active sessions');

    let terminatedCount = 0;
    for (const session of activeSessions) {
      await this.terminateContainerAndUpdateStatus(session);
      terminatedCount++;
    }

    Logger.info('[SESSION_SERVICE] Successfully terminated', terminatedCount, 'sessions');
    return terminatedCount;
  }

  /**
   * Terminate all sessions for a specific user
   */
  static async terminateUserSessions(userId: number): Promise<number> {
    Logger.info('[SESSION_SERVICE] Terminating sessions for user:', userId);

    const userSessions = await this.findSessionsByStatus([SessionStatus.PENDING, SessionStatus.ACTIVE], userId);
    Logger.info('[SESSION_SERVICE] Found', userSessions.length, 'active sessions for user', userId);

    let terminatedCount = 0;
    for (const session of userSessions) {
      await this.terminateContainerAndUpdateStatus(session);
      terminatedCount++;
    }

    Logger.info('[SESSION_SERVICE] Successfully terminated', terminatedCount, 'sessions for user', userId);
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
    const sessions = await Session.findAll({
      where: {
        userId: userId,
      },
      order: [['createdAt', 'DESC']],
    });

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
    Logger.info('[SESSION_SERVICE] Terminating session:', sessionId);

    const session = await this.requireSession(sessionId);

    await this.terminateContainerAndUpdateStatus(session);
    Logger.info('[SESSION_SERVICE] Session', sessionId, 'terminated successfully');
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<void> {
    const cutoff = new Date(Date.now() - this.SESSION_TIMEOUT_MINUTES * 60 * 1000);

    const expiredSessions = await Session.findAll({
      where: {
        status: [SessionStatus.PENDING, SessionStatus.ACTIVE],
        createdAt: { [require('sequelize').Op.lt]: cutoff },
      },
    });

    if (expiredSessions.length > 0) {
      Logger.info('[SESSION_SERVICE] Cleaning up sessions older than:', cutoff);
      Logger.info('[SESSION_SERVICE] Found', expiredSessions.length, 'expired sessions');
    }
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
      const scriptSecret = process.env.PYTHON_SCRIPT_SECRET || 'python-script-secret-key-2024';
      await DockerService.execInContainer(session.containerId, [
        'python3',
        '/usr/local/bin/cookie_extractor.py',
        '--target-domain', session.targetDomain,
        '--session-id', sessionId.toString(),
        '--backend-url', 'http://host.docker.internal:3000',
        '--script-secret', scriptSecret
      ]);

      // Update status to COMPLETED (container termination will be handled by storeSessionCookies)
      await this.updateSessionStatus(session, SessionStatus.COMPLETED);
    } catch (error) {
      Logger.error('[SESSION_SERVICE] Error during cookie extraction:', error);

      // If cookie extraction fails, we still need to terminate the container
      try {
        await DockerService.terminateContainer(session.containerId);
        Logger.info('[SESSION_SERVICE] Container terminated after failed cookie extraction');
      } catch (terminateError) {
        Logger.error('[SESSION_SERVICE] Error terminating container after failed extraction:', terminateError);
      }

      await this.updateSessionStatus(session, SessionStatus.FAILED);
      throw error;
    }
  }

  static async getActiveSession(userId: number): Promise<{ sessionId: number; novncUrl: string } | null> {
    const activeSessions = await this.findSessionsByStatus([SessionStatus.PENDING, SessionStatus.ACTIVE], userId);

    if (activeSessions.length === 0) {
      return null;
    }

    const session = activeSessions[0];
    if (!session.containerId) {
      return null;
    }

    try {
      const ports = await DockerService.getContainerPorts(session.containerId);
      if (!ports.novncPort) {
        // Don't destroy the session, just return null
        Logger.info(`[SESSION_SERVICE] Container ${session.containerId} exists but noVNC port not found for session ${session.id}`);
        return null;
      }

      return {
        sessionId: session.id,
        novncUrl: `http://localhost:${ports.novncPort}/vnc.html?autoconnect=true&password=${process.env.VNC_PASSWORD || 'password'}`,
      };
    } catch (error) {
      Logger.error(`[SESSION_SERVICE] Error getting active session details for session ${session.id}:`, error);
      // Don't destroy the session, just return null
      return null;
    }
  }
} 