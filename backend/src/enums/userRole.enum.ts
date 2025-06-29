export enum UserRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

export const roleName = {
  [UserRole.ADMIN]: 'admin',
  [UserRole.MEMBER]: 'member',
};

export default UserRole; 