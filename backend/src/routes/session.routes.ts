import { Router } from 'express';
import { createSession, storeSessionCookies, getSessionCookies, terminateAllSessions, terminateUserSessions, getAllSessions, terminateSession, getCurrentUserSessions, extractCookiesForSession } from '../controllers/session.controller';
import authenticateJWT, { adminOnly, adminOrSelf, authenticatePythonScript } from '../middleware/auth.middleware';

const router = Router();

// Public routes (if any)
router.post('/session', authenticateJWT, createSession);
router.post('/session/:id/cookies', storeSessionCookies);
router.get('/session/:id/cookies', authenticateJWT, getSessionCookies);

// User routes
router.get('/session/my-sessions', authenticateJWT, getCurrentUserSessions);

// Admin/User management routes
router.get('/session', authenticateJWT, adminOnly, getAllSessions);
router.post('/session/terminate-all', authenticateJWT, adminOnly, terminateAllSessions);
router.post('/session/:id/terminate', authenticateJWT, adminOnly, terminateSession);
router.post('/session/terminate-user/:userId', authenticateJWT, adminOrSelf, terminateUserSessions);
router.post('/session/:id/extract-cookies', authenticateJWT, extractCookiesForSession);

export default router; 