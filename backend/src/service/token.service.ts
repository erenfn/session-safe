import { User, Token } from '../models';
import { TokenType } from '../models/Token';
import { Transaction } from 'sequelize';
import { sequelize } from '../config/connection';

interface TokenInstance {
  id: number;
  token: string;
  userId: number;
  type: TokenType;
  expiresAt?: Date | null;
  createdAt: Date;
}

interface CreateTokenInput {
  token: string;
  userId: number;
  type: TokenType;
  expiresAt?: Date;
}

class TokenService {
  async createToken(inputs: CreateTokenInput): Promise<TokenInstance> {
    try {
      const token = await Token.create(inputs);
      return token as TokenInstance;
    } catch (err) {
      throw new Error('Error creating token');
    }
  }

  async findTokenByTokenAndUser(token: string, userId: number, type: TokenType): Promise<TokenInstance | null> {
    try {
      return await Token.findOne({ 
        where: { token, userId, type } 
      }) as TokenInstance | null;
    } catch (err) {
      throw new Error('Error finding token');
    }
  }

  async findTokenByToken(token: string, type: TokenType): Promise<TokenInstance | null> {
    try {
      return await Token.findOne({ 
        where: { token, type } 
      }) as TokenInstance | null;
    } catch (err) {
      throw new Error('Error finding token');
    }
  }

  async deleteTokenByUserAndType(userId: number, type: TokenType): Promise<void> {
    try {
      await Token.destroy({ where: { userId, type } });
    } catch (err) {
      throw new Error('Error deleting tokens');
    }
  }

  async deleteToken(token: string, userId: number, type: TokenType): Promise<void> {
    try {
      await Token.destroy({ where: { token, userId, type } });
    } catch (err) {
      throw new Error('Error deleting token');
    }
  }

  async deleteTokenById(tokenId: number): Promise<void> {
    try {
      await Token.destroy({ where: { id: tokenId } });
    } catch (err) {
      throw new Error('Error deleting token');
    }
  }

  async deleteUserTokens(userId: number, transaction?: Transaction): Promise<void> {
    try {
      await Token.destroy({ 
        where: { userId }, 
        transaction 
      });
    } catch (err) {
      throw new Error('Error deleting user tokens');
    }
  }
}

export default TokenService; 