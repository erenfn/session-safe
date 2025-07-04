import { DataTypes, Model, Sequelize, Optional } from 'sequelize';
import UserRole from '../enums/userRole.enum';

interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public password!: string;
  public role!: UserRole;
  public createdAt!: Date;

  // associations
  public static associate(models: any) {
    User.hasMany(models.Token, {
      foreignKey: 'userId',
      onDelete: 'CASCADE',
    });
  }
}

export default (sequelize: Sequelize): typeof User => {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(63),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password: {
        type: DataTypes.STRING(127),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM(...Object.values(UserRole)),
        allowNull: false,
        defaultValue: UserRole.MEMBER,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: false,
    }
  );

  return User;
};
