import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { generateToken, verifyToken } from '../utils/jwt.helper';
import UserRole, { roleName } from '../enums/userRole.enum';
import { TokenType } from '../models/Token';
import UserService from '../service/user.service';
import TokenService from '../service/token.service';
import UserRequestInterface from '../interfaces/request.interface';

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

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

const register = async (req: Request<{}, {}, RegisterRequest>, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: 'Email already exists' });
      return;
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const login = async (req: Request<{}, {}, LoginRequest>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await userService.getUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const dbToken = await tokenService.findTokenByTokenAndUser(token, parseInt(decoded.id), TokenType.AUTH);
    if (!dbToken) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    await tokenService.deleteTokenById(dbToken.id);
    res.status(200).json({ message: 'Successfully logged out' });
  } catch (error) {
    console.error('Error logging out user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const resetPassword = async (req: Request<{}, {}, ResetPasswordRequest>, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    const dbToken = await tokenService.findTokenByToken(token, TokenType.RESET);

    if (!dbToken) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }

    // Check if token is expired
    if (dbToken.expiresAt && new Date() > dbToken.expiresAt) {
      await tokenService.deleteTokenById(dbToken.id);
      res.status(400).json({ error: 'Token expired' });
      return;
    }

    const user = await userService.getUser(dbToken.userId);
    if (!user) {
      res.status(400).json({ error: 'User not found' });
      return;
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userService.updateUserPassword(user.id, hashedPassword);
    await tokenService.deleteTokenById(dbToken.id);

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const forgetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await userService.getUserByEmail(email);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Generate reset token
    const resetToken = generateToken({ id: user.id, email: user.email });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await tokenService.createToken({ 
      token: resetToken, 
      userId: user.id, 
      type: TokenType.RESET,
      expiresAt 
    });

    // In a real application, you would send this token via email
    res.status(200).json({ 
      message: 'Password reset token generated',
      token: resetToken // Remove this in production
    });
  } catch (error) {
    console.error('Error generating reset token:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getCurrentUser = async (req: UserRequestInterface, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'User not authenticated' });
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
      res.status(400).json({ error: 'User not found' });
    }
  } catch (err: any) {
    console.error('Error getting current user:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export {
  register,
  login,
  logout,
  resetPassword,
  forgetPassword,
  getCurrentUser,
}; 