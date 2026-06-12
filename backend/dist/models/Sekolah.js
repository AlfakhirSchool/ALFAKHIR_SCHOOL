"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Sekolah extends sequelize_1.Model {
}
Sekolah.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    nama: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    level: { type: sequelize_1.DataTypes.ENUM('SD', 'SMP', 'SMA'), allowNull: false },
}, { sequelize: database_1.default, tableName: 'sekolah', timestamps: false });
exports.default = Sekolah;
