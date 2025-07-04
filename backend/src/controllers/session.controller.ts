import { Response, RequestHandler } from 'express';
import UserRequestInterface from '../interfaces/request.interface';
import { SessionService } from '../service/session.service';
import { requireAdmin } from '../middleware/auth.middleware';
import StatusError from '../utils/statusError';
import HTTP_STATUS_CODES from '../utils/httpCodes';
import * as fs from 'fs';
import * as path from 'path';

// POST /session
export const createSession: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  const { userId, targetDomain } = req.body;
  console.log(`[SESSION] Creating session for userId: ${userId}, targetDomain: ${targetDomain}`);
  
  if (!userId || !targetDomain) {
    console.log('[SESSION] Missing required fields:', { userId, targetDomain });
    throw new StatusError('userId and targetDomain are required', HTTP_STATUS_CODES.BAD_REQUEST);
  }

  try {
    const hasActiveSession = await SessionService.hasActiveSession(userId);
    if (hasActiveSession) {
      const activeSessionInfo = await SessionService.getActiveSessionInfo(userId);
      const errorResponse: any = {
        error: 'User already has an active session. Please terminate it before creating a new one.',
        activeSession: activeSessionInfo
      };

      res.status(409).json(errorResponse);
      return;
    }

    const response = await SessionService.createSession(userId, targetDomain);
    console.log('[SESSION] Sending success response:', response);
    res.status(201).json(response);
  } catch (error: any) {
    console.error('[SESSION] Error creating session:', error);
    
    let errorMessage = 'Failed to create session';
    if (error.code === 'ENOENT') {
      errorMessage = 'Docker not found or not accessible';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to Docker daemon';
    } else if (error.message?.includes('image')) {
      errorMessage = 'Docker image issue: ' + error.message;
    }
    
    throw new StatusError(errorMessage, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
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
    throw new StatusError('encryptedCookies is required', HTTP_STATUS_CODES.BAD_REQUEST);
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
      throw new StatusError('Failed to store cookies', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
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
      throw new StatusError('Access denied: You can only view cookies from your own sessions', HTTP_STATUS_CODES.FORBIDDEN);
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
      throw new StatusError('Failed to retrieve cookies', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
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
    throw new StatusError('Failed to terminate sessions', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
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
    throw new StatusError('Failed to terminate user sessions', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
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
    throw new StatusError('Failed to fetch sessions', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

// GET /api/session/my-sessions (Current user)
export const getCurrentUserSessions: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  const userId = req.user?.id;
  console.log('[SESSION] User requesting their sessions, userId:', userId);
  
  if (!userId) {
    console.log('[SESSION] No user ID found in request');
    throw new StatusError('User not authenticated', HTTP_STATUS_CODES.UNAUTHORIZED);
  }
  
  try {
    const sessions = await SessionService.getCurrentUserSessions(Number(userId));
    res.status(200).json({ 
      success: true, 
      sessions 
    });
  } catch (error: any) {
    console.error('[SESSION] Error fetching user sessions:', error);
    throw new StatusError('Failed to fetch user sessions', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
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
      throw new StatusError('Failed to terminate session', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
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
      throw new StatusError('Access denied: You can only extract cookies from your own sessions', HTTP_STATUS_CODES.FORBIDDEN);
    }

    console.log(`[SESSION] User ${userId} authorized to extract cookies for session ${id}`);
    await SessionService.extractCookiesForSession(Number(id));
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[SESSION] Error extracting cookies:', error);
    
    if (error.message === 'Session or container not found') {
      res.status(404).json({ error: 'Session not found' });
    } else {
      throw new StatusError('Failed to extract cookies', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
    }
  }
};

export const getActiveSession: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  const userId = req.user?.id;

  try {
    const activeSession = await SessionService.getActiveSession(Number(userId));
    res.status(200).json({ success: true, activeSession });
  } catch (error: any) {
    console.error('[SESSION] Error fetching active session:', error);
    throw new StatusError('Failed to fetch active session', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};

export const terminateMyActiveSession: RequestHandler = async (req: UserRequestInterface, res: Response) => {
  const userId = req.user?.id;

  try {
    await SessionService.terminateUserSessions(Number(userId));
    res.status(200).json({ success: true, message: 'Your active session has been terminated.' });
  } catch (error: any) {
    console.error('[SESSION] Error terminating my active session:', error);
    throw new StatusError('Failed to terminate session', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
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

/**
 * GET /api/sessions/logs (SSE)
 * Only accessible by admin
 * Streams new log lines as they are written (tail -f behavior)
 */
export const getSessionServiceLogs = (req: UserRequestInterface, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const LOG_FILE_PATH = path.resolve(__dirname, '../../data/session-service.log');
  const lastNLines = parseInt(req.query.lastNLines as string) || 50;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send keep-alive comment every 30 seconds
  const keepAliveInterval = setInterval(() => {
    res.write(':\n\n');
  }, 30000);

  // Send last N lines on connect
  let fileSize = 0;
  if (fs.existsSync(LOG_FILE_PATH)) {
    const logs = fs.readFileSync(LOG_FILE_PATH, 'utf8').split(/\r?\n/);
    // Slice more lines initially to account for empty lines and keep-alive messages
    const lastLines = logs.slice(-lastNLines * 2).filter(line => 
      line.trim() !== '' && !line.startsWith(':')
    ).slice(-lastNLines);
    lastLines.forEach(line => {
      res.write(`data: ${line}\n\n`);
    });
    fileSize = fs.statSync(LOG_FILE_PATH).size;
  }

  let lastSize = fileSize;
  fs.watchFile(LOG_FILE_PATH, { interval: 1000 }, (curr, prev) => {
    if (curr.size > lastSize) {
      const stream = fs.createReadStream(LOG_FILE_PATH, {
        start: lastSize,
        end: curr.size,
        encoding: 'utf8',
      });
      stream.on('data', (chunk) => {
        const strChunk = chunk.toString();
        strChunk.split(/\r?\n/).forEach((line: string) => {
          if (line.trim() !== '') {
            res.write(`data: ${line}\n\n`);
          }
        });
      });
      lastSize = curr.size;
    }
  });

  // Clean up on client disconnect
  req.on('close', () => {
    fs.unwatchFile(LOG_FILE_PATH);
    clearInterval(keepAliveInterval);
    res.end();
  });
}; 