import { sequelize } from '../config/connection';
import UserModel from './User';
import TokenModel, { TokenType } from './Token';
import SessionModel, { SessionStatus } from './Session';

const User = UserModel(sequelize);
const Token = TokenModel(sequelize);
const Session = SessionModel(sequelize);

const models = {
  User,
  Token,
  Session,
};

Object.values(models).forEach((model: any) => {
  if ('associate' in model) {
    model.associate(models);
  }
});

export { User, Token, TokenType, Session, SessionStatus, sequelize };
export default models;