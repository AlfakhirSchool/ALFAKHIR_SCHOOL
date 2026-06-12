"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Absensi extends sequelize_1.Model {
}
Absensi.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    siswa_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    jadwal_pelajaran_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'jadwal_pelajaran', key: 'id' } },
    tanggal: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false },
    waktu_hadir: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    status: { type: sequelize_1.DataTypes.ENUM('hadir', 'sakit', 'izin', 'alfa'), allowNull: false },
    qr_code_scanned: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: false },
    input_code: { type: sequelize_1.DataTypes.STRING(6), allowNull: true },
    catatan: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    created_by: { type: sequelize_1.DataTypes.UUID, allowNull: false },
}, {
    sequelize: database_1.default,
    tableName: 'absensi',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at',
});
exports.default = Absensi;
