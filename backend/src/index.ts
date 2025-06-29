import dotenv from 'dotenv';
import api from './server';

dotenv.config();

const PORT = process.env.PORT ?? 3000;

const startServer = async () => {
  try {
    // Start the server
    api.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server: ', error);
    process.exit(1);
  }
};

startServer();
