"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const database_1 = __importDefault(require("./config/database"));
const logger_1 = __importDefault(require("./config/logger"));
require("./models/index");
const PORT = parseInt(process.env.PORT || '3001');
const startServer = async () => {
    try {
        await database_1.default.authenticate();
        logger_1.default.info('Database connection established');
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
