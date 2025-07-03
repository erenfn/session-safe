import { NextFunction, Response, Request } from 'express';
import UserRequestInterface from '../interfaces/request.interface';
import { TokenType } from '../models/Token';
import HTTP_STATUS_CODES from '../utils/httpCodes';
import { verifyToken } from '../utils/jwt.helper';
import StatusError from '../utils/statusError';
import TokenService from '../service/token.service';
import UserService from '../service/user.service';
import UserRole from '../enums/userRole.enum';
import { Session } from '../models';
import { comparePassword } from '../utils/auth.helper';

const tokenService = new TokenService();
const userService = new UserService();
// Check if user has admin role
export const isAdmin = (role?: string): boolean => role === UserRole.ADMIN;

// Validate admin access
export const requireAdmin = (req: UserRequestInterface, res: Response): boolean => {
  if (!req.user?.role) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }
  
  if (!isAdmin(req.user.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  
  return true;
};

// Validate user permissions (admin or self)
export const requireAdminOrSelf = (req: UserRequestInterface, res: Response, targetUserId: string): boolean => {
  if (!req.user?.id || !req.user?.role) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }
  
  if (!isAdmin(req.user.role) && req.user.id !== targetUserId) {
    res.status(403).json({ error: 'Not authorized' });
    return false;
  }
  
  return true;
};

// Middleware for admin-only routes
export const adminOnly = (req: UserRequestInterface, res: Response, next: NextFunction): void => {
  if (!req.user?.role) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  if (!isAdmin(req.user.role)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  next();
};

// Middleware for admin or self routes
export const adminOrSelf = (req: UserRequestInterface, res: Response, next: NextFunction): void => {
  if (!req.user?.id || !req.user?.role) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  const targetUserId = req.params.userId;
  if (!isAdmin(req.user.role) && req.user.id !== targetUserId) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }
  
  next();
};

const authenticateJWT = async (req: UserRequestInterface, res: Response, next: NextFunction) => {
  const token = req.headers?.authorization?.split(' ')[1];
  if (!token) return next(new StatusError('Token not provided', HTTP_STATUS_CODES.UNAUTHORIZED));

  try {
    const decoded = verifyToken(token);
    if (!decoded) return next(new StatusError('Invalid token', HTTP_STATUS_CODES.UNAUTHORIZED));

    const dbToken = await tokenService.findTokenByTokenAndUser(token, parseInt(decoded.id), TokenType.AUTH);
    if (!dbToken) return next(new StatusError('Invalid token', HTTP_STATUS_CODES.UNAUTHORIZED));

    // JWT tokens have built-in expiration, so we don't need to manually check expiration
    // The verifyToken function above already handles JWT expiration
    const user = await userService.getUser(parseInt(decoded.id));
    if (!user) {
      return next(new StatusError('User not found', HTTP_STATUS_CODES.NOT_FOUND));
    }
    req.user = {
      id: user.id.toString(),
      email: user.email,
      role: user.role,
    };
    next();
  } catch (error) {
    // If it's already a StatusError, pass it to next middleware
    if (error instanceof StatusError) {
      return next(error);
    }
    // Only catch unexpected errors and convert them to generic error
    console.error('Error authenticating token:', error);
    return next(new StatusError('Internal Server Error', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR));
  }
};

export default authenticateJWT;

/**
 * Middleware to authenticate requests from the Python script
 * Uses a shared secret key for internal service communication
 */
export const authenticatePythonScript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers['x-python-script-auth'] as string;
    const sessionId = req.params.id;

    if (!authHeader) {
      res.status(401).json({ error: 'Python script authentication required' });
      return;
    }

    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }
    
    const session = await Session.findByPk(sessionId);
    if (!session || !session.pythonScriptSecret) {
      res.status(404).json({ error: 'Session not found or secret not set' });
      return;
    }

    const isMatch = await comparePassword(authHeader, session.pythonScriptSecret);
    
    if (!isMatch) {
      res.status(403).json({ error: 'Invalid Python script authentication token' });
      return;
    }
    
    next();
  } catch(error) {
    console.error('[AUTH] Error in Python script authentication:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};
