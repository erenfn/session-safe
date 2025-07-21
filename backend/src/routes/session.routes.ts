import { Router } from 'express';
import { createSession, createSessionFromCookies, storeSessionCookies, getSessionCookies, terminateAllSessions, terminateUserSessions, getAllSessions, terminateSession, getCurrentUserSessions, extractCookiesForSession, getSessionServiceLogs, getActiveSession, terminateMyActiveSession, getNoVncPort } from '../controllers/session.controller';
import authenticateJWT, { adminOnly, adminOrSelf, authenticatePythonScript } from '../middleware/auth.middleware';

const router = Router();

// Python script calls this route
router.post('/session/:id/cookies', authenticatePythonScript, storeSessionCookies);
// SSE route
router.get('/session/logs', authenticateJWT, adminOnly, getSessionServiceLogs);

// User routes
router.post('/session', authenticateJWT, createSession);
router.post('/session/:id/clone', authenticateJWT, createSessionFromCookies);
router.get('/session/:id/cookies', authenticateJWT, getSessionCookies);
router.post('/session/:id/extract-cookies', authenticateJWT, extractCookiesForSession);
router.get('/session/my-sessions', authenticateJWT, getCurrentUserSessions);
router.get('/session/active', authenticateJWT, getActiveSession);
router.post('/session/terminate-mine', authenticateJWT, terminateMyActiveSession);

// Admin routes
router.get('/session', authenticateJWT, adminOnly, getAllSessions);
router.post('/session/terminate-all', authenticateJWT, adminOnly, terminateAllSessions);
router.post('/session/:id/terminate', authenticateJWT, adminOnly, terminateSession);
router.post('/session/terminate-user/:userId', authenticateJWT, adminOrSelf, terminateUserSessions);

// Expose for nginx Lua dynamic proxying (no auth)
router.get('/novnc-port/:sessionId', getNoVncPort);

export default router; 