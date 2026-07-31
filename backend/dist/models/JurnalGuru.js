"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class JurnalGuru extends sequelize_1.Model {
}
JurnalGuru.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    guru_id: { type: sequelize_1.DataTypes.UUID, allowNull: false },
    wali_kelas_id: { type: sequelize_1.DataTypes.UUID, allowNull: true },
    kelas_id: { type: sequelize_1.DataTypes.UUID, allowNull: false },
    mata_pelajaran_id: { type: sequelize_1.DataTypes.UUID, allowNull: false },
    tanggal: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false },
    hari: { type: sequelize_1.DataTypes.STRING(10), allowNull: true },
    jam_mulai: { type: sequelize_1.DataTypes.TIME, allowNull: true },
    jam_selesai: { type: sequelize_1.DataTypes.TIME, allowNull: true },
    topik_pelajaran: { type: sequelize_1.DataTypes.STRING(500), allowNull: false },
    metode_pembelajaran: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    deskripsi_pembelajaran: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    hasil_pembelajaran: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    hambatan_pembelajaran: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    rencana_tindak_lanjut: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    media_pembelajaran: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    sumber_belajar: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    jumlah_siswa_hadir: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    jumlah_siswa_sakit: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    jumlah_siswa_izin: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    jumlah_siswa_alfa: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    ttd_guru: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    signed_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    ttd_wali_kelas: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    wali_kelas_signed_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    status: { type: sequelize_1.DataTypes.ENUM('draft', 'submitted', 'reviewed', 'approved'), defaultValue: 'draft' },
    deleted_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
}, {
    sequelize: database_1.default,
    tableName: 'jurnal_guru',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
});
exports.default = JurnalGuru;
