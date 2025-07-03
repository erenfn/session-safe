import bcrypt from 'bcryptjs';

const decode = (str: string) => {
  const isBase64 = /^data:image\/[a-zA-Z]+;base64,/.test(str);
  try {
    if (isBase64) {
      return Buffer.from(str, 'base64').toString('utf-8');
    } else {
      return decodeURIComponent(str);
    }
  } catch {
    return str;
  }
};

const saltRounds = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

export { decode };
