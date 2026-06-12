"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', async (req, res) => {
    const { sekolah_id, tahun_ajaran } = req.query;
    const where = {};
    if (sekolah_id)
        where.sekolah_id = sekolah_id;
    if (tahun_ajaran)
        where.tahun_ajaran = tahun_ajaran;
    const kelasList = await models_1.Kelas.findAll({
        where,
        include: [
            { model: models_1.Sekolah, as: 'sekolah' },
            { model: models_1.Guru, as: 'wali_kelas', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
        ],
        order: [['tingkat', 'ASC'], ['nama', 'ASC']],
    });
    res.json({ success: true, data: kelasList });
});
router.post('/', (0, auth_1.authorize)('admin'), async (req, res) => {
    const kelas = await models_1.Kelas.create(req.body);
    res.status(201).json({ success: true, data: kelas });
});
router.get('/:id/siswa', async (req, res) => {
    const siswaList = await models_1.Siswa.findAll({
        where: { kelas_id: req.params.id },
        include: [{ model: models_1.User, as: 'user', attributes: { exclude: ['password_hash'] } }],
        order: [[{ model: models_1.User, as: 'user' }, 'nama', 'ASC']],
    });
    res.json({ success: true, data: siswaList });
});
router.get('/:id/jadwal', async (req, res) => {
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
