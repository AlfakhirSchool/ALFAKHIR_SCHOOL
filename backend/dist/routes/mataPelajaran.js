"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_1 = require("../models");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', async (_req, res) => {
    const list = await models_1.MataPelajaran.findAll({ order: [['nama', 'ASC']] });
    res.json({ success: true, data: list });
});
router.post('/', (0, auth_1.authorize)('admin'), async (req, res) => {
    const mapel = await models_1.MataPelajaran.create(req.body);
    res.status(201).json({ success: true, data: mapel });
});
router.put('/:id', (0, auth_1.authorize)('admin'), async (req, res) => {
    const mapel = await models_1.MataPelajaran.findByPk(req.params.id);
    if (!mapel)
        throw (0, errorHandler_1.createError)('Mata pelajaran tidak ditemukan', 404);
    await mapel.update(req.body);
    res.json({ success: true, data: mapel });
});
router.delete('/:id', (0, auth_1.authorize)('admin'), async (req, res) => {
    const mapel = await models_1.MataPelajaran.findByPk(req.params.id);
    if (!mapel)
        throw (0, errorHandler_1.createError)('Mata pelajaran tidak ditemukan', 404);
    await mapel.destroy();
    res.json({ success: true, message: 'Mata pelajaran berhasil dihapus' });
});
exports.default = router;
