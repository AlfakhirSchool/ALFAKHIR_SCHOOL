import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'alfakhir_school',
  username: process.env.DB_USER || 'alfakhir',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true',
  dialectOptions:
    process.env.DB_SSL === 'true'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: { max: 30, min: 2, acquire: 30000, idle: 10000 },
  define: { underscored: true, timestamps: true, paranoid: false },
});

export default sequelize;
