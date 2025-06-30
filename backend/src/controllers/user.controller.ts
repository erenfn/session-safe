import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import UserService from '../service/user.service';
import { internalServerError } from '../utils/errors.helper';
import { roleName } from '../enums/userRole.enum';
import UserRequestInterface from '../interfaces/request.interface';

const userService = new UserService();

interface UserQuery {
  page?: string;
  limit?: string;
  search?: string;
}

interface UserBody {
  username?: string;
}

const checkAtLeastOneField = (req: Request<{}, {}, UserBody>, res: Response, next: NextFunction): void => {
  const { username } = req.body;

  if (username === undefined) {
    console.error("'username' must be provided");
    res.status(400).json({
      updated: false,
      error: 'Error, no value provided to update',
    });
    return;
  }

  next();
};

const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ updated: false, errors: errors.array() });
    return;
  }
  next();
};

const validateProfileUpdate = [
  body('username').optional().isString().trim().escape(),
];

const getUpdatedFields = (original: UserBody, updated: UserBody): Partial<UserBody> => {
  const result: Partial<UserBody> = {};

  (Object.keys(original) as Array<keyof UserBody>).forEach((key) => {
    if (updated[key]) {
      result[key] = updated[key];
    }
  });

  return result;
};

const getUsersList = async (req: Request<{}, {}, {}, UserQuery>, res: Response): Promise<void> => {
  const { page = '1', limit = '10', search = '' } = req.query;

  try {
    const { rows: users, count: totalUsers } = await userService.getUsers({ page, limit, search });

    const returnObj = {
      users: users.map((user: any) => ({
        username: user.username,
        email: user.email,
        role: roleName[user.role as keyof typeof roleName],
      })),
      totalPages: Math.ceil(totalUsers / parseInt(limit)),
      currentPage: parseInt(page),
      totalUsers,
    };

    res.status(200).json(returnObj);
  } catch (err: any) {
    const { statusCode, payload } = internalServerError('GET_USER_LIST_ERROR', err.message);
    res.status(statusCode).json(payload);
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
      res.status(200).json({ user: { id, username, email, role: roleName[role as keyof typeof roleName] } });
    } else {
      res.status(400).json({ error: 'User not found' });
    }
  } catch (err: any) {
    const { statusCode, payload } = internalServerError('GET_USER_ERROR', err.message);
    res.status(statusCode).json(payload);
  }
};

const updateUserDetails = async (req: UserRequestInterface, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'User not authenticated' });
    return;
  }
  
  const inputs = req.body;
  try {
    const updatedUser = await userService.updateUser(parseInt(userId), inputs);

    res.status(200).json({ updated: true, user: getUpdatedFields(inputs, updatedUser) });
  } catch (err: any) {
    const { statusCode, payload } = internalServerError('UPDATE_USER_ERROR', err.message);
    res.status(statusCode).json(payload);
  }
};

const deleteUser = async (req: UserRequestInterface, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }
    
    await userService.deleteUser(parseInt(userId));

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err: any) {
    const { statusCode, payload } = internalServerError('DELETE_USER_ERROR', err.message);
    res.status(statusCode).json(payload);
  }
};

const hasUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await userService.hasUsers();
    res.status(200).json(result);
  } catch (err: any) {
    const { statusCode, payload } = internalServerError('GET_USERS_ERROR', err.message);
    res.status(statusCode).json(payload);
  }
};

export {
  getUsersList,
  getCurrentUser,
  updateUserDetails,
  deleteUser,
  checkAtLeastOneField,
  validateProfileUpdate,
  handleValidationErrors,
  userService,
  hasUsers,
}; 