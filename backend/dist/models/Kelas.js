"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Kelas extends sequelize_1.Model {
}
Kelas.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    sekolah_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'sekolah', key: 'id' } },
    nama: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    tingkat: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    wali_kelas_id: { type: sequelize_1.DataTypes.UUID, allowNull: true, references: { model: 'guru', key: 'id' } },
    tahun_ajaran: { type: sequelize_1.DataTypes.STRING(20), allowNull: false },
}, { sequelize: database_1.default, tableName: 'kelas', timestamps: false });
exports.default = Kelas;
