import { Sequelize } from 'sequelize';

const {
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  POSTGRES_HOST,
  POSTGRES_PORT,
} = process.env;

// Validate required environment variables
const requiredEnvVars = [
  { name: 'POSTGRES_USER', value: POSTGRES_USER },
  { name: 'POSTGRES_PASSWORD', value: POSTGRES_PASSWORD },
  { name: 'POSTGRES_DB', value: POSTGRES_DB },
  { name: 'POSTGRES_HOST', value: POSTGRES_HOST },
  { name: 'POSTGRES_PORT', value: POSTGRES_PORT },
];

const missingEnvVars = requiredEnvVars.filter(({ value }) => !value);
if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.map(v => v.name).join(', ')}`);
}

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: POSTGRES_HOST!,
  port: Number(POSTGRES_PORT),
  username: POSTGRES_USER!,
  password: POSTGRES_PASSWORD!,
  database: POSTGRES_DB!,
  logging: false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

const connection = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection has been established successfully.');
    return sequelize;
  } catch (error) {
    console.error('Unable to connect to the PostgreSQL database:', error);
    throw error;
  }
};

export { sequelize };
export default connection;
