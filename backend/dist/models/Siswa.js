"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Siswa extends sequelize_1.Model {
}
Siswa.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, unique: true, references: { model: 'users', key: 'id' } },
    kelas_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'kelas', key: 'id' } },
    nisn: { type: sequelize_1.DataTypes.STRING(20), allowNull: false, unique: true },
    nis: { type: sequelize_1.DataTypes.STRING(20), allowNull: false },
    no_induk: { type: sequelize_1.DataTypes.STRING(20), allowNull: false },
    tempat_lahir: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    tanggal_lahir: { type: sequelize_1.DataTypes.DATEONLY, allowNull: true },
    alamat: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
}, { sequelize: database_1.default, tableName: 'siswa', timestamps: false });
exports.default = Siswa;
