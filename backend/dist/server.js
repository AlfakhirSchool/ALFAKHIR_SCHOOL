"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const database_1 = __importDefault(require("./config/database"));
const logger_1 = __importDefault(require("./config/logger"));
require("./models/index");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PORT = parseInt(process.env.PORT || '3001');
const runMigrations = async () => {
    const migrationsDir = path_1.default.join(__dirname, 'migrations');
    if (!fs_1.default.existsSync(migrationsDir))
        return;
    // Ensure tracking table exists
    await database_1.default.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
    const [applied] = await database_1.default.query('SELECT filename FROM schema_migrations');
    const appliedSet = new Set(applied.map((r) => r.filename));
    const files = fs_1.default.readdirSync(migrationsDir)
        .filter(f => /^\d{3}_/.test(f) && f.endsWith('.sql') && f !== '001_init_schema.sql')
        .sort();
    for (const file of files) {
        if (appliedSet.has(file))
            continue; // already ran
        try {
            const sql = fs_1.default.readFileSync(path_1.default.join(migrationsDir, file), 'utf-8');
            await database_1.default.query(sql);
            await database_1.default.query('INSERT INTO schema_migrations (filename) VALUES (:f)', { replacements: { f: file } });
            logger_1.default.info(`Migration applied: ${file}`);
        }
        catch (err) {
            logger_1.default.warn(`Migration ${file} warning: ${err.message}`);
        }
    }
};
const startServer = async () => {
    try {
        await database_1.default.authenticate();
        logger_1.default.info('Database connection established');
        // Run pending migrations
        await runMigrations();
        // sync models (use migrations in production)
        if (process.env.NODE_ENV === 'development') {
            await database_1.default.sync({ alter: false });
            logger_1.default.info('Database models synced');
        }
        app_1.default.listen(PORT, '0.0.0.0', () => {
            logger_1.default.info(`Al Fakhir School API running on port ${PORT}`);
            logger_1.default.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
            logger_1.default.info(`Health check: http://localhost:${PORT}/api/health`);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
