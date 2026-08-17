"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentDashboard = exports.parentDashboard = exports.guruDashboard = exports.adminDashboard = void 0;
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const models_1 = require("../models");
const redis_1 = __importDefault(require("../config/redis"));
const getStatsForLevel = async (level) => {
    const sekolah = await models_1.Sekolah.findOne({ where: { level } });
    if (!sekolah)
        return { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
    const kelasList = await models_1.Kelas.findAll({ where: { sekolah_id: sekolah.id }, attributes: ['id'] });
    const kelasIds = kelasList.map((k) => k.id);
    const totalKelas = kelasIds.length;
    if (totalKelas === 0)
        return { sekolahId: sekolah.id, namaSekolah: sekolah.nama, totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };
    const [totalSiswa, absensiHariIni] = await Promise.all([
        models_1.Siswa.count({ where: { kelas_id: { [sequelize_1.Op.in]: kelasIds } } }),
        models_1.Absensi.count({
            where: { tanggal: new Date().toISOString().split('T')[0], status: 'hadir' },
            include: [{ model: models_1.Siswa, as: 'siswa', where: { kelas_id: { [sequelize_1.Op.in]: kelasIds } }, attributes: [] }],
            distinct: true,
            col: 'siswa_id',
        }),
    ]);
    return { sekolahId: sekolah.id, namaSekolah: sekolah.nama, totalSiswa, totalKelas, absensiHariIni };
};
const adminDashboard = async (_req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `dashboard:admin:${today}`;
    const cached = await redis_1.default.get(cacheKey).catch(() => null);
    if (cached) {
        res.json(JSON.parse(cached));
        return;
    }
    const [sd, smp, totalGuru, pendingJurnal] = await Promise.all([
        getStatsForLevel('SD'),
        getStatsForLevel('SMP'),
        models_1.Guru.count(),
        models_1.JurnalGuru.count({ where: { status: 'submitted' } }),
    ]);
    const totalSiswa = sd.totalSiswa + smp.totalSiswa;
    const totalKelas = sd.totalKelas + smp.totalKelas;
    const absensiHariIni = sd.absensiHariIni + smp.absensiHariIni;
    const result = {
        success: true,
        data: {
            kpi: { totalSiswa, totalGuru, totalKelas, absensiHariIni, pendingJurnal },
            sekolah: { sd, smp },
        },
    };
    // cache 60 detik — data absensi hari ini berubah per menit, tidak perlu real-time
    redis_1.default.setex(cacheKey, 60, JSON.stringify(result)).catch(() => { });
    res.json(result);
};
exports.adminDashboard = adminDashboard;
const guruDashboard = async (req, res) => {
    const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
    if (!guru) {
        res.json({ success: true, data: {} });
        return;
    }
    const hariMap = { 0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };
    const hariIni = hariMap[new Date().getDay()];
    const [jurnalBulanIni, jurnalPending, jadwalGuru] = await Promise.all([
        models_1.JurnalGuru.count({
            where: {
                guru_id: guru.id,
                tanggal: { [sequelize_1.Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
            },
        }),
        models_1.JurnalGuru.count({ where: { guru_id: guru.id, status: 'submitted' } }),
        models_1.JadwalPelajaran.findAll({ where: { guru_id: guru.id }, attributes: ['kelas_id', 'hari'] }),
    ]);
    const totalKelas = new Set(jadwalGuru.map((j) => j.kelas_id)).size;
    const jadwalHariIni = jadwalGuru.filter((j) => j.hari === hariIni).length;
    res.json({
        success: true,
        data: {
            kpi: { jurnalBulanIni, jurnalPending, totalKelas, jadwalHariIni },
            school_levels: guru.school_levels || [],
        },
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
