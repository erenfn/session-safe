import { NextFunction, Response } from 'express';
import UserRequestInterface from '../interfaces/request.interface';
import { TokenType } from '../models/Token';
import HTTP_STATUS_CODES from '../utils/httpCodes';
import { verifyToken } from '../utils/jwt.helper';
import StatusError from '../utils/statusError';
import TokenService from '../service/token.service';
import UserService from '../service/user.service';

const tokenService = new TokenService();
const userService = new UserService();

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
