"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class Rapor extends sequelize_1.Model {
}
Rapor.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    siswa_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    semester: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    tahun_ajaran: { type: sequelize_1.DataTypes.STRING(20), allowNull: false },
    jumlah_hadir: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    jumlah_sakit: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    jumlah_izin: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    jumlah_alfa: { type: sequelize_1.DataTypes.INTEGER, defaultValue: 0 },
    nilai_rata_rata: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true },
    ranking: { type: sequelize_1.DataTypes.INTEGER, allowNull: true },
    pdf_file: { type: sequelize_1.DataTypes.STRING(500), allowNull: true },
    generated_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
}, {
    sequelize: database_1.default,
    tableName: 'rapor',
    timestamps: false,
    indexes: [{ unique: true, fields: ['siswa_id', 'semester', 'tahun_ajaran'] }],
});
exports.default = Rapor;
