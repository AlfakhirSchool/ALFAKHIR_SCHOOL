"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentDashboard = exports.parentDashboard = exports.guruDashboard = exports.adminDashboard = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const models_1 = require("../models");
const adminDashboard = async (_req, res) => {
    const [totalSiswa, totalGuru, totalKelas, absensiHariIni, pendingJurnal, tunggakanCount] = await Promise.all([
        models_1.Siswa.count(),
        models_1.Guru.count(),
        models_1.Kelas.count(),
        models_1.Absensi.count({ where: { tanggal: new Date().toISOString().split('T')[0] } }),
        models_1.JurnalGuru.count({ where: { status: 'submitted' } }),
        models_1.Pembayaran.count({ where: { status: { [sequelize_1.Op.in]: ['belum_bayar', 'sebagian'] } } }),
    ]);
    res.json({
        success: true,
        data: {
            kpi: { totalSiswa, totalGuru, totalKelas, absensiHariIni, pendingJurnal, tunggakanCount },
        },
    });
};
exports.adminDashboard = adminDashboard;
const guruDashboard = async (req, res) => {
    const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
    if (!guru) {
        res.json({ success: true, data: {} });
        return;
    }
    const [jurnalBulanIni, jurnalPending] = await Promise.all([
        models_1.JurnalGuru.count({
            where: {
                guru_id: guru.id,
                tanggal: {
                    [sequelize_1.Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                },
            },
        }),
        models_1.JurnalGuru.count({ where: { guru_id: guru.id, status: 'submitted' } }),
    ]);
    res.json({
        success: true,
        data: { kpi: { jurnalBulanIni, jurnalPending } },
    });
};
exports.guruDashboard = guruDashboard;
const parentDashboard = async (req, res) => {
    res.json({
        success: true,
        data: { message: 'Parent dashboard - filtered by child' },
    });
};
exports.parentDashboard = parentDashboard;
const studentDashboard = async (req, res) => {
    const siswa = await models_1.Siswa.findOne({ where: { user_id: req.user.id } });
    if (!siswa) {
        res.json({ success: true, data: {} });
        return;
    }
    const tahunAjaran = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const [absensiSummary, nilaiList, pembayaranList] = await Promise.all([
        models_1.Absensi.findAll({
            where: { siswa_id: siswa.id },
            attributes: ['status', [database_1.default.fn('COUNT', database_1.default.col('status')), 'total']],
            group: ['status'],
        }),
        models_1.Nilai.findAll({ where: { siswa_id: siswa.id, tahun_ajaran: tahunAjaran } }),
        models_1.Pembayaran.findAll({ where: { siswa_id: siswa.id, tahun_ajaran: tahunAjaran } }),
    ]);
    res.json({
        success: true,
        data: { absensi: absensiSummary, nilai: nilaiList, pembayaran: pembayaranList },
    });
};
exports.studentDashboard = studentDashboard;
