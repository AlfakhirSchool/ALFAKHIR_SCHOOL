"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const levelFilter_1 = require("../utils/levelFilter");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', (0, auth_1.authorize)('admin', 'guru', 'siswa', 'ortu'), async (req, res) => {
    let { guru_id, kelas_id, jenjang } = req.query;
    const levelWhere = await (0, levelFilter_1.kelasIdFilter)(req.user?.school_level);
    const where = { ...levelWhere };
    // Guru hanya bisa lihat jadwal miliknya sendiri
    if (req.user.role === 'guru') {
        const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
        if (guru)
            guru_id = guru.id;
    }
    if (guru_id)
        where.guru_id = guru_id;
    if (kelas_id)
        where.kelas_id = kelas_id;
    // Filter jenjang via sekolah.level pada kelas
    const sekolahWhere = {};
    if (jenjang)
        sekolahWhere.level = jenjang;
    const jadwalList = await models_1.JadwalPelajaran.findAll({
        where,
        include: [
            { model: models_1.Guru, as: 'guru', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
            { model: models_1.Kelas, as: 'kelas', required: !!jenjang, include: [{ model: models_1.Sekolah, as: 'sekolah', attributes: ['level'], where: Object.keys(sekolahWhere).length ? sekolahWhere : undefined }] },
            { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
        ],
        order: [['hari', 'ASC'], ['jam_mulai', 'ASC']],
    });
    res.json({ success: true, data: jadwalList });
});
// Guru bisa buat jadwal sendiri, admin bisa buat untuk siapapun
router.post('/', (0, auth_1.authorize)('admin', 'guru'), async (req, res) => {
    try {
        let body = { ...req.body };
        // Guru: paksa guru_id ke diri sendiri
        if (req.user.role === 'guru') {
            const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
            if (!guru) {
                res.status(400).json({ success: false, message: 'Data guru tidak ditemukan' });
                return;
            }
            body.guru_id = guru.id;
        }
        // Cegah duplikat: cek jadwal sama sudah ada
        const existing = await models_1.JadwalPelajaran.findOne({
            where: { guru_id: body.guru_id, kelas_id: body.kelas_id, hari: body.hari, jam_mulai: body.jam_mulai },
        });
        if (existing) {
            res.status(409).json({ success: false, message: 'Jadwal dengan guru, kelas, hari, dan jam yang sama sudah ada' });
            return;
        }
        const jadwal = await models_1.JadwalPelajaran.create(body);
        res.status(201).json({ success: true, data: jadwal });
    }
    catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});
// Hanya admin atau guru pemilik yang bisa edit
router.put('/:id', (0, auth_1.authorize)('admin', 'guru'), async (req, res) => {
    const jadwal = await models_1.JadwalPelajaran.findByPk(req.params.id);
    if (!jadwal)
        throw (0, errorHandler_1.createError)('Jadwal tidak ditemukan', 404);
    if (req.user.role === 'guru') {
        const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
        if (!guru || jadwal.guru_id !== guru.id) {
            res.status(403).json({ success: false, message: 'Hanya bisa edit jadwal sendiri' });
            return;
        }
    }
    await jadwal.update(req.body);
    res.json({ success: true, data: jadwal });
});
// Hanya admin atau guru pemilik yang bisa hapus
router.delete('/:id', (0, auth_1.authorize)('admin', 'guru'), async (req, res) => {
    const jadwal = await models_1.JadwalPelajaran.findByPk(req.params.id);
    if (!jadwal)
        throw (0, errorHandler_1.createError)('Jadwal tidak ditemukan', 404);
    if (req.user.role === 'guru') {
        const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
        if (!guru || jadwal.guru_id !== guru.id) {
            res.status(403).json({ success: false, message: 'Hanya bisa hapus jadwal sendiri' });
            return;
        }
    }
    await models_1.QrCodeSession.destroy({ where: { jadwal_pelajaran_id: jadwal.id } });
    await models_1.Absensi.destroy({ where: { jadwal_pelajaran_id: jadwal.id } });
    await jadwal.destroy();
    res.json({ success: true, message: 'Jadwal berhasil dihapus' });
});
exports.default = router;
