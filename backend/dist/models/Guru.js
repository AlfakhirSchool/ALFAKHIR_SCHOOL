"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Guru extends sequelize_1.Model {
}
Guru.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, unique: true, references: { model: 'users', key: 'id' } },
    nip: { type: sequelize_1.DataTypes.STRING(30), allowNull: true, unique: true },
    spesialisasi: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    no_telp: { type: sequelize_1.DataTypes.STRING(20), allowNull: true },
}, { sequelize: database_1.default, tableName: 'guru', timestamps: false });
exports.default = Guru;
