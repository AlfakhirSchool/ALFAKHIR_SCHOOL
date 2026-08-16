"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Pembayaran extends sequelize_1.Model {
}
Pembayaran.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    siswa_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    tahun_ajaran: { type: sequelize_1.DataTypes.STRING(20), allowNull: false },
    jenis_biaya: { type: sequelize_1.DataTypes.STRING(100), allowNull: false },
    nominal_biaya: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false },
    nominal_terbayar: { type: sequelize_1.DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    status: { type: sequelize_1.DataTypes.ENUM('belum_bayar', 'sebagian', 'lunas'), defaultValue: 'belum_bayar' },
    virtual_account: { type: sequelize_1.DataTypes.STRING(30), allowNull: true },
    va_bank: { type: sequelize_1.DataTypes.ENUM('bca', 'mandiri'), allowNull: true },
    tanggal_jatuh_tempo: { type: sequelize_1.DataTypes.DATEONLY, allowNull: true },
    tanggal_bayar: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    metode_bayar: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    bukti_bayar: { type: sequelize_1.DataTypes.STRING(500), allowNull: true },
}, {
    sequelize: database_1.default,
    tableName: 'pembayaran',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        { unique: true, fields: ['siswa_id', 'tahun_ajaran', 'jenis_biaya'], name: 'pembayaran_siswa_tahun_jenis_unique' },
    ],
});
exports.default = Pembayaran;
