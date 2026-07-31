"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const sequelize = new sequelize_1.Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'alfakhir_school',
    username: process.env.DB_USER || 'alfakhir',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true',
    dialectOptions: process.env.DB_SSL === 'true'
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 30, min: 2, acquire: 30000, idle: 10000 },
    define: { underscored: true, timestamps: true, paranoid: false },
});
exports.default = sequelize;
