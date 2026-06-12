"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hitungNilaiAkhir = hitungNilaiAkhir;
exports.hitungGrade = hitungGrade;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
function hitungNilaiAkhir(kuis, tugas, uts, uas) {
    return Math.round(kuis * 0.1 + tugas * 0.15 + uts * 0.25 + uas * 0.5);
}
function hitungGrade(nilai) {
    if (nilai >= 85)
        return { grade: 'A', predikat: 'Sangat Baik' };
    if (nilai >= 75)
        return { grade: 'B', predikat: 'Baik' };
    if (nilai >= 65)
        return { grade: 'C', predikat: 'Cukup' };
    if (nilai >= 55)
        return { grade: 'D', predikat: 'Kurang' };
    return { grade: 'E', predikat: 'Sangat Kurang' };
}
class Nilai extends sequelize_1.Model {
}
Nilai.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    siswa_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    mata_pelajaran_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'mata_pelajaran', key: 'id' } },
    guru_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'guru', key: 'id' } },
    semester: { type: sequelize_1.DataTypes.INTEGER, allowNull: false },
    tahun_ajaran: { type: sequelize_1.DataTypes.STRING(20), allowNull: false },
    kuis: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true },
    tugas: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true },
    uts: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true },
    uas: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true },
    nilai_akhir: { type: sequelize_1.DataTypes.DECIMAL(5, 2), allowNull: true },
    grade: { type: sequelize_1.DataTypes.STRING(2), allowNull: true },
    predikat: { type: sequelize_1.DataTypes.STRING(30), allowNull: true },
    catatan: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    input_date: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    update_date: { type: sequelize_1.DataTypes.DATE, allowNull: true },
}, {
    sequelize: database_1.default,
    tableName: 'nilai',
    timestamps: false,
    indexes: [{ unique: true, fields: ['siswa_id', 'mata_pelajaran_id', 'semester', 'tahun_ajaran'] }],
});
exports.default = Nilai;
