import bcrypt from 'bcryptjs';
import { QueryInterface, QueryTypes } from 'sequelize';
import UserRole from '../enums/userRole.enum';

const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

interface UserSeedData {
  username: string;
  email: string;
  password: string;
  role: string;
  created_at: Date;
}

async function runSeeders(queryInterface: QueryInterface): Promise<void> {
  // Check if users already exist to prevent duplicate seeding
  const existingUsers = await queryInterface.sequelize.query(
    'SELECT COUNT(*) as count FROM users',
    { type: QueryTypes.SELECT }
  ) as unknown as Array<{ count: number }>;
  
  if (existingUsers[0].count > 0) {
    console.log('Users already exist, skipping seeders');
    return;
  }

  const hashedPassword1 = '$2a$10$9XIB7./q9LYvumMGbdcAEuyi16x16HOGvpiQjqUN0egghgXn51v.y';
  const hashedPassword2 = await hashPassword('MemberPassword123!');

  const userSeedData: UserSeedData[] = [
    {
      username: "administrator",
      email: "admin@gmail.com",
      password: hashedPassword1,
      role: UserRole.ADMIN,
      created_at: new Date(),
    },
    {
      username: "member",
      email: "member@gmail.com",
      password: hashedPassword2,
      role: UserRole.MEMBER,
      created_at: new Date(),
    },
  ];

  await queryInterface.bulkInsert("users", userSeedData, {});
  
  console.log('Seeders completed successfully');
}

export { runSeeders };