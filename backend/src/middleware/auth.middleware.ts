import { NextFunction, Response, Request } from 'express';
import UserRequestInterface from '../interfaces/request.interface';
import { TokenType } from '../models/Token';
import HTTP_STATUS_CODES from '../utils/httpCodes';
import { verifyToken } from '../utils/jwt.helper';
import StatusError from '../utils/statusError';
import TokenService from '../service/token.service';
import UserService from '../service/user.service';
import UserRole from '../enums/userRole.enum';
import jwt from 'jsonwebtoken';

const tokenService = new TokenService();
const userService = new UserService();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PYTHON_SCRIPT_SECRET = process.env.PYTHON_SCRIPT_SECRET || 'python-script-secret-key-2024';

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
export const authenticatePythonScript = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['x-python-script-auth'];
  
  console.log('[AUTH] Received headers:', req.headers);
  console.log('[AUTH] Python script auth header:', authHeader);
  console.log('[AUTH] Expected secret:', PYTHON_SCRIPT_SECRET);
  
  if (!authHeader) {
    console.log('[AUTH] Missing Python script authentication header - continuing anyway');
    // Continue without authentication for now
    next();
    return;
  }

  if (authHeader !== PYTHON_SCRIPT_SECRET) {
    console.log('[AUTH] Invalid Python script authentication token - continuing anyway');
    console.log('[AUTH] Received:', authHeader);
    console.log('[AUTH] Expected:', PYTHON_SCRIPT_SECRET);
    // Continue without authentication for now
    next();
    return;
  }

  console.log('[AUTH] Python script authenticated successfully');
  next();
};
