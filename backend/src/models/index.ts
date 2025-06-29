import { sequelize } from '../config/connection';
import UserModel from './User';
import TokenModel, { TokenType } from './Token';

const User = UserModel(sequelize);
const Token = TokenModel(sequelize);

const models = {
  User,
  Token,
};

Object.values(models).forEach((model: any) => {
  if ('associate' in model) {
    model.associate(models);
  }
});

export { User, Token, TokenType, sequelize };
export default models;