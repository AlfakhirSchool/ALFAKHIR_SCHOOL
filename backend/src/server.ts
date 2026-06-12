import app from './app';
import sequelize from './config/database';
import logger from './config/logger';
import './models/index';

const PORT = parseInt(process.env.PORT || '3001');

const startServer = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    // sync models (use migrations in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('Database models synced');
    }

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Al Fakhir School API running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
