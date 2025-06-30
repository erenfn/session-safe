import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { generateToken, verifyToken } from '../utils/jwt.helper';
import UserRole, { roleName } from '../enums/userRole.enum';
import { TokenType } from '../models/Token';
import UserService from '../service/user.service';
import TokenService from '../service/token.service';
import UserRequestInterface from '../interfaces/request.interface';
import StatusError from '../utils/statusError';
import HTTP_STATUS_CODES from '../utils/httpCodes';

const userService = new UserService();
const tokenService = new TokenService();

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface LoginRequest {
  email: string;
  password: string;
}


const register = async (req: Request<{}, {}, RegisterRequest>, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      throw new StatusError('Email already exists', HTTP_STATUS_CODES.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userService.createUser({
      username,
      email,
      password: hashedPassword,
      role: UserRole.MEMBER, // Default role for new registrations
    });

    const token = generateToken({ id: newUser.id, email: newUser.email });

    await tokenService.createToken({ 
      token, 
      userId: newUser.id, 
      type: TokenType.AUTH 
    });

    res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: roleName[newUser.role as UserRole],
      },
      token,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    if (error instanceof StatusError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
  }
};

const login = async (req: Request<{}, {}, LoginRequest>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await userService.getUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new StatusError('Invalid credentials', HTTP_STATUS_CODES.UNAUTHORIZED);
    }

    await tokenService.deleteTokenByUserAndType(user.id, TokenType.AUTH);

    const token = generateToken({ id: user.id, email: user.email });
    await tokenService.createToken({ token, userId: user.id, type: TokenType.AUTH });

    res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: roleName[user.role as UserRole],
      },
      token,
    });
  } catch (error) {
    console.error('Error logging in user:', error);
    if (error instanceof StatusError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
  }
};

const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new StatusError('No token provided', HTTP_STATUS_CODES.UNAUTHORIZED);
    }
    
    const decoded = verifyToken(token);

    if (!decoded) {
      throw new StatusError('Invalid token', HTTP_STATUS_CODES.UNAUTHORIZED);
    }

    const dbToken = await tokenService.findTokenByTokenAndUser(token, parseInt(decoded.id), TokenType.AUTH);
    if (!dbToken) {
      throw new StatusError('Invalid token', HTTP_STATUS_CODES.UNAUTHORIZED);
    }

    await tokenService.deleteTokenById(dbToken.id);
    res.status(200).json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error('Error logging out user:', error);
    if (error instanceof StatusError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
  }
};

const getCurrentUser = async (req: UserRequestInterface, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(HTTP_STATUS_CODES.UNAUTHORIZED).json({ error: 'User not authenticated' });
    return;
  }
  
  try {
    const user = await userService.getUser(parseInt(userId));
    if (user) {
      const { id, username, email, role } = user;
      res.status(200).json({ 
        user: { 
          id, 
          username, 
          email, 
          role: roleName[role as UserRole] 
        } 
      });
    } else {
      throw new StatusError('User not found', HTTP_STATUS_CODES.BAD_REQUEST);
    }
  } catch (err: any) {
    console.error('Error getting current user:', err);
    if (err instanceof StatusError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: 'Internal Server Error' });
    }
  }
};

export {
  register,
  login,
  logout,
  getCurrentUser,
}; 