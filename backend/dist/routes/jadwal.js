"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', async (req, res) => {
    const { guru_id, kelas_id } = req.query;
    const where = {};
    if (guru_id)
        where.guru_id = guru_id;
    if (kelas_id)
        where.kelas_id = kelas_id;
    const jadwalList = await models_1.JadwalPelajaran.findAll({
        where,
        include: [
            { model: models_1.Guru, as: 'guru', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
            { model: models_1.Kelas, as: 'kelas' },
            { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
        ],
        order: [['hari', 'ASC'], ['jam_mulai', 'ASC']],
    });
    res.json({ success: true, data: jadwalList });
});
router.post('/', (0, auth_1.authorize)('admin'), async (req, res) => {
    const jadwal = await models_1.JadwalPelajaran.create(req.body);
    res.status(201).json({ success: true, data: jadwal });
});
router.put('/:id', (0, auth_1.authorize)('admin'), async (req, res) => {
    const jadwal = await models_1.JadwalPelajaran.findByPk(req.params.id);
    if (!jadwal)
        throw (0, errorHandler_1.createError)('Jadwal tidak ditemukan', 404);
    await jadwal.update(req.body);
    res.json({ success: true, data: jadwal });
});
router.delete('/:id', (0, auth_1.authorize)('admin'), async (req, res) => {
    const jadwal = await models_1.JadwalPelajaran.findByPk(req.params.id);
    if (!jadwal)
        throw (0, errorHandler_1.createError)('Jadwal tidak ditemukan', 404);
    await jadwal.destroy();
    res.json({ success: true, message: 'Jadwal berhasil dihapus' });
});
exports.default = router;
