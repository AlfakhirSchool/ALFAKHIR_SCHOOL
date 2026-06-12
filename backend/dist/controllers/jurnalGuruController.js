"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPdf = exports.getLaporanKelas = exports.review = exports.submit = exports.remove = exports.getAll = exports.getById = exports.update = exports.create = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const errorHandler_1 = require("../middleware/errorHandler");
const create = async (req, res) => {
    const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
    if (!guru)
        throw (0, errorHandler_1.createError)('Data guru tidak ditemukan', 404);
    const jurnal = await models_1.JurnalGuru.create({ ...req.body, guru_id: guru.id, status: 'draft' });
    res.status(201).json({ success: true, message: 'Jurnal berhasil dibuat', data: jurnal });
};
exports.create = create;
const update = async (req, res) => {
    const jurnal = await models_1.JurnalGuru.findByPk(req.params.id);
    if (!jurnal)
        throw (0, errorHandler_1.createError)('Jurnal tidak ditemukan', 404);
    const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
    if (req.user.role !== 'admin' && jurnal.guru_id !== guru?.id) {
        throw (0, errorHandler_1.createError)('Tidak berhak mengubah jurnal ini', 403);
    }
    if (jurnal.status === 'approved') {
        throw (0, errorHandler_1.createError)('Jurnal yang sudah disetujui tidak bisa diubah', 400);
    }
    await jurnal.update({ ...req.body, status: 'draft' });
    res.json({ success: true, message: 'Jurnal berhasil diperbarui', data: jurnal });
};
exports.update = update;
const getById = async (req, res) => {
    const jurnal = await models_1.JurnalGuru.findByPk(req.params.id, {
        include: [
            { model: models_1.Guru, as: 'guru', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
            { model: models_1.Kelas, as: 'kelas' },
            { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
        ],
    });
    if (!jurnal)
        throw (0, errorHandler_1.createError)('Jurnal tidak ditemukan', 404);
    res.json({ success: true, data: jurnal });
};
exports.getById = getById;
const getAll = async (req, res) => {
    const { kelas_id, guru_id, status, start_date, end_date, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (kelas_id)
        where.kelas_id = kelas_id;
    if (status)
        where.status = status;
    if (start_date && end_date) {
        where.tanggal = { [sequelize_1.Op.between]: [new Date(start_date), new Date(end_date)] };
    }
    if (req.user.role === 'guru') {
        const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
        if (guru)
            where.guru_id = guru.id;
    }
    else if (guru_id) {
        where.guru_id = guru_id;
    }
    const { count, rows } = await models_1.JurnalGuru.findAndCountAll({
        where,
        include: [
            { model: models_1.Guru, as: 'guru', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
            { model: models_1.Kelas, as: 'kelas' },
            { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
        ],
        limit: parseInt(limit),
        offset,
        order: [['tanggal', 'DESC']],
    });
    res.json({
        success: true,
        data: rows,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) },
    });
};
exports.getAll = getAll;
const remove = async (req, res) => {
    const jurnal = await models_1.JurnalGuru.findByPk(req.params.id);
    if (!jurnal)
        throw (0, errorHandler_1.createError)('Jurnal tidak ditemukan', 404);
    await jurnal.destroy();
    res.json({ success: true, message: 'Jurnal berhasil dihapus' });
};
exports.remove = remove;
const submit = async (req, res) => {
    const jurnal = await models_1.JurnalGuru.findByPk(req.params.id);
    if (!jurnal)
        throw (0, errorHandler_1.createError)('Jurnal tidak ditemukan', 404);
    if (jurnal.status !== 'draft')
        throw (0, errorHandler_1.createError)('Hanya jurnal draft yang bisa disubmit', 400);
    const ttd_guru = req.body.ttd_guru || null;
    await jurnal.update({ status: 'submitted', ttd_guru, signed_at: ttd_guru ? new Date() : null });
    res.json({ success: true, message: 'Jurnal berhasil disubmit untuk review', data: jurnal });
};
exports.submit = submit;
const review = async (req, res) => {
    const jurnal = await models_1.JurnalGuru.findByPk(req.params.id);
    if (!jurnal)
        throw (0, errorHandler_1.createError)('Jurnal tidak ditemukan', 404);
    const { action, ttd_wali_kelas, catatan } = req.body;
    if (action === 'approve') {
        await jurnal.update({
            status: 'approved',
            ttd_wali_kelas,
            wali_kelas_signed_at: new Date(),
        });
        res.json({ success: true, message: 'Jurnal disetujui', data: jurnal });
    }
    else if (action === 'reject') {
        await jurnal.update({ status: 'draft' });
        res.json({ success: true, message: 'Jurnal dikembalikan ke draft', data: jurnal });
    }
    else {
        res.status(400).json({ success: false, message: 'Action tidak valid (approve/reject)' });
    }
};
exports.review = review;
const getLaporanKelas = async (req, res) => {
    const jurnalList = await models_1.JurnalGuru.findAll({
        where: { kelas_id: req.params.id },
        include: [
            { model: models_1.Guru, as: 'guru', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
            { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
        ],
        order: [['tanggal', 'DESC']],
    });
    const summary = {
        total: jurnalList.length,
        draft: jurnalList.filter(j => j.status === 'draft').length,
        submitted: jurnalList.filter(j => j.status === 'submitted').length,
        approved: jurnalList.filter(j => j.status === 'approved').length,
    };
    res.json({ success: true, data: jurnalList, summary });
};
exports.getLaporanKelas = getLaporanKelas;
const exportPdf = async (req, res) => {
    const jurnal = await models_1.JurnalGuru.findByPk(req.params.id, {
        include: [
            { model: models_1.Guru, as: 'guru', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
            { model: models_1.Kelas, as: 'kelas' },
            { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
        ],
    });
    if (!jurnal)
        throw (0, errorHandler_1.createError)('Jurnal tidak ditemukan', 404);
    // PDF generation akan di-implement dengan jsPDF atau pdfkit
    res.json({ success: true, message: 'Export PDF jurnal - coming soon', data: jurnal });
};
exports.exportPdf = exportPdf;
