"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class OrangTua extends sequelize_1.Model {
}
OrangTua.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    siswa_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    hubungan: { type: sequelize_1.DataTypes.STRING(50), allowNull: false },
    no_telp: { type: sequelize_1.DataTypes.STRING(20), allowNull: true },
}, { sequelize: database_1.default, tableName: 'orang_tua', timestamps: false });
exports.default = OrangTua;
