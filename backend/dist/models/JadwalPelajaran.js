"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class JadwalPelajaran extends sequelize_1.Model {
}
JadwalPelajaran.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    kelas_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'kelas', key: 'id' } },
    guru_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'guru', key: 'id' } },
    mata_pelajaran_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'mata_pelajaran', key: 'id' } },
    hari: {
        type: sequelize_1.DataTypes.ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'),
        allowNull: false,
    },
    jam_mulai: { type: sequelize_1.DataTypes.TIME, allowNull: false },
    jam_selesai: { type: sequelize_1.DataTypes.TIME, allowNull: false },
    ruangan: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
}, { sequelize: database_1.default, tableName: 'jadwal_pelajaran', timestamps: false });
exports.default = JadwalPelajaran;
