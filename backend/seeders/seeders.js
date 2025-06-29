const bcrypt = require('bcryptjs');
const UserRole = require('../src/enums/userRole.enum').default;

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

async function runSeeders(queryInterface) {
  // Check if users already exist to prevent duplicate seeding
  const existingUsers = await queryInterface.sequelize.query(
    'SELECT COUNT(*) as count FROM users',
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  );
  
  if (existingUsers[0].count > 0) {
    console.log('Users already exist, skipping seeders');
    return;
  }

  const hashedPassword1 =  '$2a$10$9XIB7./q9LYvumMGbdcAEuyi16x16HOGvpiQjqUN0egghgXn51v.y'
  const hashedPassword2 = await hashPassword('MemberPassword123!');

  console.log('Hashed Passwords:');
  console.log('Admin:', hashedPassword1);
  console.log('Member:', hashedPassword2);

  await queryInterface.bulkInsert(
    "users",
    [
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
    ],
    {}
  );
  
  console.log('Seeders completed successfully');
}

module.exports = { runSeeders };