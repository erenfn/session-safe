import { Session, SessionStatus, User } from '../models';
import { DockerService } from './docker.service';
import { decryptCookies } from '../utils/crypto.helper';
import { Logger } from '../utils/logger.helper';
import constants from '../utils/constants.helper';
import crypto from 'crypto';
import { hashPassword } from '../utils/auth.helper';

export class SessionService {
  private static SESSION_TIMEOUT_MINUTES = 15;

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

      const vncPassword = session.vncPassword || 'password';
      const novncUrl = `${constants.BASE_URL}:${ports.novncPort}/vnc.html?autoconnect=true&password=${vncPassword}&resize=scale`;
      
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
      vncPassword: null, // will set after generation
    });
    Logger.info('[SESSION_SERVICE] Database session created with ID:', session.id, 'for userId:', userId);

    // Generate a secure random VNC password
    const vncPassword = crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);
    session.vncPassword = vncPassword;
    await session.save();

    const containerInfo = await DockerService.createBrowserSessionContainer(
      vncPassword // pass to DockerService for container setup
    );

    session.containerId = containerInfo.containerId;
    await this.updateSessionStatus(session, SessionStatus.ACTIVE);

    const response = {
      sessionId: session.id,
      vncPort: containerInfo.vncPort,
      novncPort: containerInfo.novncPort,
      containerId: containerInfo.containerId,
      novncUrl: `${constants.BASE_URL}:${containerInfo.novncPort}/vnc.html?autoconnect=true&password=${vncPassword}&resize=scale`,
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
        status: [SessionStatus.PENDING, SessionStatus.ACTIVE, SessionStatus.TERMINATING],
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
    Logger.info(`[SESSION_SERVICE] Starting cookie extraction for session: ${sessionId}`);

    const session = await this.requireSessionWithContainer(sessionId);

    const plainTextSecret = crypto.randomBytes(32).toString('hex');
    const hashedSecret = await hashPassword(plainTextSecret);
    await Session.update({ pythonScriptSecret: hashedSecret }, { where: { id: sessionId } });

    // Set status to TERMINATING
    await this.updateSessionStatus(session, SessionStatus.TERMINATING);
    // Command to execute in the container
    const command = [
      'python3',
      '/usr/local/bin/cookie_extractor.py',
      '--session-id', sessionId.toString(),
      '--api-url', 'http://host.docker.internal:3000',
      '--secret', plainTextSecret,
      '--target-domain', session.targetDomain,
      '--encryption-key', process.env.COOKIE_ENCRYPTION_KEY || 'this_is_a_32byte_key_12345678901'
    ];

    try {
      await DockerService.execInContainer(session.containerId, command, 'browser');
      await this.updateSessionStatus(session, SessionStatus.COMPLETED);
      Logger.info(`[SESSION_SERVICE] Successfully initiated cookie extraction for session: ${sessionId}`);
    } catch (e: any) {
      Logger.error(`[SESSION_SERVICE] Failed to extract cookies for session ${sessionId}:`, e);
      await this.updateSessionStatus(session, SessionStatus.FAILED);
      throw new Error('Failed to extract cookies');
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

      const vncPassword = session.vncPassword || 'password';
      const novncUrl = `${constants.BASE_URL}:${ports.novncPort}/vnc.html?autoconnect=true&password=${vncPassword}&resize=scale`;
      
      return {
        sessionId: session.id,
        novncUrl: novncUrl,
      };
    } catch (error) {
      Logger.error(`[SESSION_SERVICE] Error getting active session details for session ${session.id}:`, error);
      // Don't destroy the session, just return null
      return null;
    }
  }
} 