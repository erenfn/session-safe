import db from '../models';
import { Transaction } from 'sequelize';
import { Op } from 'sequelize';
import UserRole from '../enums/userRole.enum';
import { sequelize } from '../config/connection';

const { User, Token } = db;

// Define the UserInstance type based on the User model
interface UserInstance {
  id: number;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
}

interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

interface GetUsersParams {
  search: string;
  page: string | number;
  limit: string | number;
}

interface UpdateUserInputs {
  username?: string;
  email?: string;
}

class UserService {
  async createUser(inputs: CreateUserInput): Promise<UserInstance> {
    try {
      const user = await User.create({
        ...inputs,
        role: inputs.role || UserRole.MEMBER, // Default to MEMBER if not specified
      });
      return user as UserInstance;
    } catch (err) {
      throw new Error('Error creating user');
    }
  }

  async getUser(userId: string | number): Promise<UserInstance | null> {
    try {
      return await User.findOne({
        where: { id: userId },
      }) as UserInstance | null;
    } catch (err) {
      throw new Error('Error retrieving User by ID');
    }
  }

  async getUserByEmail(email: string): Promise<UserInstance | null> {
    try {
      return await User.findOne({
        where: { email },
      }) as UserInstance | null;
    } catch (err) {
      throw new Error('Error retrieving User by email');
    }
  }

  async getUsers({ search, page, limit }: GetUsersParams): Promise<{
    count: number;
    rows: UserInstance[];
  }> {
    try {
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

      const result = await User.findAndCountAll({
        where: {
          username: {
            [Op.like]: `%${search}%`,
          },
        },
        limit: parseInt(limit as string),
        offset,
      });

      return {
        count: result.count,
        rows: result.rows as UserInstance[],
      };
    } catch (err) {
      throw new Error('Error retrieving users list');
    }
  }

  async updateUser(userId: string | number, inputs: UpdateUserInputs): Promise<UserInstance> {
    try {
      const details: Partial<UpdateUserInputs> = {
        ...(inputs.username && { username: inputs.username }),
        ...(inputs.email && { email: inputs.email }),
      };

      const [rowsUpdated] = await User.update(details, {
        where: { id: userId },
        returning: false,
      });

      if (rowsUpdated > 0) {
        const updatedUser = await User.findOne({ where: { id: userId } });
        return updatedUser as UserInstance;
      } else {
        throw new Error('User not found or no changes made');
      }
    } catch (err) {
      throw new Error('Error updating user');
    }
  }

  async updateUserPassword(userId: string | number, hashedPassword: string): Promise<void> {
    try {
      const [rowsUpdated] = await User.update(
        { password: hashedPassword },
        { where: { id: userId } }
      );

      if (rowsUpdated === 0) {
        throw new Error('User not found');
      }
    } catch (err) {
      throw new Error('Error updating user password');
    }
  }

  async deleteUser(userId: string | number): Promise<void> {
    const transaction: Transaction = await sequelize.transaction();
    try {
      const user = await User.findOne({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      if (user.role === UserRole.ADMIN) {
        const adminCount = await User.count({
          where: { role: UserRole.ADMIN },
        });
        if (adminCount <= 1) {
          throw new Error("The team has only single admin and can't delete themselves");
        }
      }

      await User.destroy({ where: { id: userId }, transaction });
      await Token.destroy({ where: { userId }, transaction });

      await transaction.commit();
    } catch (err: any) {
      await transaction.rollback();
      throw new Error(`Error deleting user ~ ${err.message}`);
    }
  }

  async hasUsers(): Promise<{ usersExist: boolean }> {
    try {
      const userCount = await User.count();
      return { usersExist: userCount > 0 };
    } catch (err) {
      throw new Error('Failed to get user count');
    }
  }

  async getAdminCount(): Promise<number> {
    try {
      return await User.count({
        where: { role: UserRole.ADMIN },
      });
    } catch (err) {
      throw new Error('Failed to get admin count');
    }
  }
}

export default UserService;
