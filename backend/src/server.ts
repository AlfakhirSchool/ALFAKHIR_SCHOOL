import app from './app';
import sequelize from './config/database';
import logger from './config/logger';
import './models/index';
import fs from 'fs';
import path from 'path';

const PORT = parseInt(process.env.PORT || '3001');

const runMigrations = async (): Promise<void> => {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  // Ensure tracking table exists
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const [applied] = await sequelize.query('SELECT filename FROM schema_migrations') as any;
  const appliedSet = new Set((applied as any[]).map((r: any) => r.filename));

  const files = fs.readdirSync(migrationsDir)
    .filter(f => /^\d{3}_/.test(f) && f.endsWith('.sql') && f !== '001_init_schema.sql')
    .sort();

  for (const file of files) {
    if (appliedSet.has(file)) continue; // already ran
    try {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await sequelize.query(sql);
      await sequelize.query('INSERT INTO schema_migrations (filename) VALUES (:f)', { replacements: { f: file } });
      logger.info(`Migration applied: ${file}`);
    } catch (err: any) {
      logger.warn(`Migration ${file} warning: ${err.message}`);
    }
  }
};

const startServer = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Run pending migrations
    await runMigrations();

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
