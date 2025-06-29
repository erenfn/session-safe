export enum TokenType {
  AUTH = 'auth',
  RESET = 'reset',
}

export const tokenType = {
  [TokenType.AUTH]: 'auth',
  [TokenType.RESET]: 'reset',
};

export default TokenType; 