import { DataTypes, Model, Sequelize, Optional } from 'sequelize';

export enum TokenType {
  AUTH = 'auth',
  RESET = 'reset',
}

export interface TokenAttributes {
  id: number;
  token: string;
  userId: number;
  type: TokenType;
  expiresAt?: Date | null;
  createdAt: Date;
}

export type TokenCreationAttributes = Optional<TokenAttributes, 'id' | 'expiresAt' | 'createdAt'>;

export class Token extends Model<TokenAttributes, TokenCreationAttributes> implements TokenAttributes {
  public id!: number;
  public token!: string;
  public userId!: number;
  public type!: TokenType;
  public expiresAt!: Date | null;
  public createdAt!: Date;

  // associations
  public static associate(models: any) {
    Token.belongsTo(models.User, {
      foreignKey: 'userId',
      onDelete: 'CASCADE',
    });
  }
}

export default (sequelize: Sequelize): typeof Token => {
  Token.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      token: {
        type: DataTypes.STRING(511),
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      type: {
        type: DataTypes.ENUM(...Object.values(TokenType)),
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Token',
      tableName: 'tokens',
      timestamps: false,
    }
  );

  return Token;
};