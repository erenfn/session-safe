import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import errorMiddleware from './middleware/error.middleware';
import constantsHelper from './utils/constants.helper';
import { sequelize } from './config/connection';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import sessionRoutes from './routes/session.routes';
import { startSessionCleanupJob } from './controllers/session.controller';
import { runSeeders } from './seeders/seeders';

const { MAX_FILE_SIZE } = constantsHelper;

const app = express();
app.use(cors({
  origin: 'http://localhost:4173',
  credentials: true
}));
app.options('*', cors({
  origin: 'http://localhost:4173',
  credentials: true
})); // this is for preflight requests
app.use(helmet());
app.use(express.json({ limit: MAX_FILE_SIZE }));

// Database connection and sync
sequelize
  .authenticate()
  .then(() => console.log("Database connected..."))
  .catch((err) => console.log("Error: " + err));

sequelize
  .sync({ alter: true })
  .then(async () => {
    console.log("Models synced with the database...");
    try {
      await runSeeders(sequelize.getQueryInterface());
      console.log("Seeders completed successfully");
    } catch (error) {
      console.error("Error running seeders:", error);
    }
  })
  .catch((err) => {
    console.error("Error syncing models:", err);
    // If sync fails, try to continue without seeding
    console.log("Continuing without database sync...");
  });

startSessionCleanupJob();

app.get('/api/health', async (req, res) => {
  const serverMsg = 'Server is up and running.';
  let postgresMsg = 'PostgreSQL is not connected.';
  
  try {
    await sequelize.authenticate();
    postgresMsg = 'PostgreSQL is connected.';
  } catch (error: any) {
    postgresMsg = `PostgreSQL connection error: ${error.message}`;
  }
  
  res.send(`${serverMsg} \n ${postgresMsg}`);
});

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', sessionRoutes);

app.use(errorMiddleware);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

export default app;
