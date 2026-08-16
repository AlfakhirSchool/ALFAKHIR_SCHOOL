"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const levelFilter_1 = require("../utils/levelFilter");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, auth_1.authorize)('admin', 'guru', 'keuangan'), async (req, res) => {
    try {
        const { sekolah_id, tahun_ajaran, jenjang } = req.query;
        const where = {};
        const sekolahWhere = {};
        if (req.user?.role === 'guru' && !req.query.all) {
            // Guru hanya melihat kelas yang menjadi wali kelas atau mengajar via jadwal
            const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
            if (!guru) {
                res.json({ success: true, data: [] });
                return;
            }
            where[sequelize_1.Op.or] = [
                { wali_kelas_id: guru.id },
                database_1.default.literal(`EXISTS (SELECT 1 FROM jadwal_pelajaran jp WHERE jp.kelas_id = "Kelas"."id" AND jp.guru_id = '${guru.id}')`),
            ];
        }
        else if (req.user?.school_level) {
            // Admin jenjang hanya lihat kelas sekolahnya
            const sid = await (0, levelFilter_1.getSekolahIdForLevel)(req.user.school_level);
            where.sekolah_id = sid;
        }
        else if (sekolah_id) {
            where.sekolah_id = sekolah_id;
        }
        else if (jenjang) {
            // Master admin filter by jenjang via sekolah.level
            sekolahWhere.level = jenjang;
        }
        if (tahun_ajaran)
            where.tahun_ajaran = tahun_ajaran;
        const kelasList = await models_1.Kelas.findAll({
            where,
            include: [
                { model: models_1.Sekolah, as: 'sekolah', where: Object.keys(sekolahWhere).length ? sekolahWhere : undefined },
                { model: models_1.Guru, as: 'wali_kelas', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
            ],
            order: [['tingkat', 'ASC'], ['nama', 'ASC']],
        });
        res.json({ success: true, data: kelasList });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message || 'Gagal memuat kelas' });
    }
});
router.post('/', (0, auth_1.authorize)('admin'), async (req, res) => {
    if (req.user?.school_level) {
        const sid = await (0, levelFilter_1.getSekolahIdForLevel)(req.user.school_level);
        req.body.sekolah_id = sid;
    }
    // Auto-resolve sekolah_id dari tingkat jika tidak dikirim
    if (!req.body.sekolah_id && req.body.tingkat) {
        const tingkat = parseInt(req.body.tingkat);
        const level = tingkat <= 6 ? 'SD' : tingkat <= 9 ? 'SMP' : 'SMA';
        const sekolah = await models_1.Sekolah.findOne({ where: { level } });
        if (sekolah)
            req.body.sekolah_id = sekolah.id;
    }
    const existing = await models_1.Kelas.findOne({ where: { nama: req.body.nama, sekolah_id: req.body.sekolah_id, tahun_ajaran: req.body.tahun_ajaran } });
    if (existing) {
        res.status(409).json({ success: false, message: `Kelas "${req.body.nama}" sudah ada di sekolah ini untuk tahun ajaran ${req.body.tahun_ajaran}` });
        return;
    }
    if (!req.body.wali_kelas_id)
        req.body.wali_kelas_id = null;
    const kelas = await models_1.Kelas.create(req.body);
    res.status(201).json({ success: true, data: kelas });
});
router.put('/:id', (0, auth_1.authorize)('admin'), async (req, res) => {
    const kelas = await models_1.Kelas.findByPk(req.params.id, { include: [{ model: models_1.Sekolah, as: 'sekolah' }] });
    if (!kelas) {
        res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
        return;
    }
    // Cek kepemilikan level
    if (req.user?.school_level && kelas.sekolah?.level !== req.user.school_level) {
        res.status(403).json({ success: false, message: 'Akses ditolak' });
        return;
    }
    const { sekolah_id, ...rest } = req.body;
    const updateData = { ...rest };
    if (sekolah_id)
        updateData.sekolah_id = sekolah_id;
    if (!updateData.wali_kelas_id)
        updateData.wali_kelas_id = null;
    await kelas.update(updateData);
    res.json({ success: true, data: kelas });
});
router.delete('/:id', (0, auth_1.authorize)('admin'), async (req, res) => {
    const kelas = await models_1.Kelas.findByPk(req.params.id, { include: [{ model: models_1.Sekolah, as: 'sekolah' }] });
    if (!kelas) {
        res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
        return;
    }
    if (req.user?.school_level && kelas.sekolah?.level !== req.user.school_level) {
        res.status(403).json({ success: false, message: 'Akses ditolak' });
        return;
    }
    const siswaCount = await models_1.Siswa.count({ where: { kelas_id: kelas.id } });
    if (siswaCount > 0) {
        res.status(409).json({ success: false, message: `Tidak bisa hapus: kelas masih memiliki ${siswaCount} siswa` });
        return;
    }
    await kelas.destroy();
    res.json({ success: true, message: 'Kelas berhasil dihapus' });
});
router.get('/:id/siswa', (0, auth_1.authorize)('admin', 'guru'), async (req, res) => {
    const siswaList = await models_1.Siswa.findAll({
        where: { kelas_id: req.params.id },
        include: [{ model: models_1.User, as: 'user', attributes: { exclude: ['password_hash', 'password_default'] } }],
        order: [[{ model: models_1.User, as: 'user' }, 'nama', 'ASC']],
    });
    res.json({ success: true, data: siswaList });
});
router.get('/:id/jadwal', (0, auth_1.authorize)('admin', 'guru'), async (req, res) => {
    const jadwalList = await models_1.JadwalPelajaran.findAll({
        where: { kelas_id: req.params.id },
        include: [
            { model: models_1.Guru, as: 'guru', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
            { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
        ],
        order: [['hari', 'ASC'], ['jam_mulai', 'ASC']],
    });
    res.json({ success: true, data: jadwalList });
});
exports.default = router;
