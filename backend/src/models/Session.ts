// models/Session.ts

import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export enum SessionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DESTROYED = 'destroyed',
}

export interface SessionAttributes {
  id: number;
  userId: number;
  targetDomain: string;
  containerId: string | null;
  status: SessionStatus;
  encryptedCookies: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

export type SessionCreationAttributes = Optional<
  SessionAttributes,
  'id' | 'containerId' | 'encryptedCookies' | 'status' | 'createdAt' | 'updatedAt'
>;

export class Session extends Model<SessionAttributes, SessionCreationAttributes> implements SessionAttributes {
  public id!: number;
  public userId!: number;
  public targetDomain!: string;
  public containerId!: string | null;
  public status!: SessionStatus;
  public encryptedCookies!: string | null;
  public createdAt!: Date;
  public updatedAt!: Date;
  public user?: {
    id: number;
    username: string;
    email: string;
  };

  public static associate(models: any) {
    Session.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  }
}

export default (sequelize: Sequelize): typeof Session => {
  Session.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      targetDomain: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      containerId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(SessionStatus)),
        allowNull: false,
        defaultValue: SessionStatus.PENDING,
      },
      encryptedCookies: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'sessions',
      modelName: 'Session',
      timestamps: true,
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
    }
  );

  return Session;
};
