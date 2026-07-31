"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadExcel = exports.exportPdf = exports.getLaporanKelas = exports.review = exports.submit = exports.remove = exports.getAll = exports.getById = exports.update = exports.create = void 0;
const sequelize_1 = require("sequelize");
const XLSX = __importStar(require("xlsx"));
const models_1 = require("../models");
const errorHandler_1 = require("../middleware/errorHandler");
const levelFilter_1 = require("../utils/levelFilter");
const create = async (req, res) => {
    let guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
    if (!guru) {
        if (req.user.role === 'admin') {
            guru = await models_1.Guru.create({ user_id: req.user.id, school_levels: [] });
        }
        else {
            throw (0, errorHandler_1.createError)('Data guru tidak ditemukan', 404);
        }
    }
    // Cegah duplikat jurnal untuk guru+kelas+mapel+tanggal yang sama
    if (req.body.kelas_id && req.body.mata_pelajaran_id && req.body.tanggal) {
        const existing = await models_1.JurnalGuru.findOne({
            where: { guru_id: guru.id, kelas_id: req.body.kelas_id, mata_pelajaran_id: req.body.mata_pelajaran_id, tanggal: req.body.tanggal },
        });
        if (existing) {
            res.status(409).json({ success: false, message: 'Jurnal untuk kelas, mata pelajaran, dan tanggal ini sudah ada', data: existing });
            return;
        }
    }
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
    const levelWhere = await (0, levelFilter_1.kelasIdFilter)(req.user?.school_level);
    const where = { ...levelWhere };
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
    const ttd_guru = req.body?.ttd_guru || null;
    await jurnal.update({ status: 'submitted', ttd_guru, signed_at: ttd_guru ? new Date() : null }, { validate: false });
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
    res.json({ success: true, message: 'Export PDF jurnal - coming soon', data: jurnal });
};
exports.exportPdf = exportPdf;
const downloadExcel = async (req, res) => {
    const { kelas_id, status, guru_id, start_date, end_date } = req.query;
    const levelWhere = await (0, levelFilter_1.kelasIdFilter)(req.user?.school_level);
    const where = {};
    if (status)
        where.status = status;
    if (start_date)
        where.tanggal = { [sequelize_1.Op.gte]: start_date };
    if (start_date && end_date)
        where.tanggal = { [sequelize_1.Op.between]: [start_date, end_date] };
    const kelasWhere = { ...levelWhere };
    if (kelas_id)
        kelasWhere.id = kelas_id;
    const list = await models_1.JurnalGuru.findAll({
        where,
        include: [
            { model: models_1.Guru, as: 'guru', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
            { model: models_1.Kelas, as: 'kelas', where: Object.keys(kelasWhere).length ? kelasWhere : undefined, required: !!kelas_id },
            { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
        ],
        order: [['tanggal', 'DESC']],
    });
    const rows = list.map((j) => ({
        'Tanggal': j.tanggal ? new Date(j.tanggal).toLocaleDateString('id-ID') : '',
        'Guru': j.guru?.user?.nama || '',
        'Kelas': j.kelas?.nama || '',
        'Mata Pelajaran': j.mata_pelajaran?.nama || '',
        'Topik': j.topik_pelajaran || '',
        'Tugas': j.deskripsi_pembelajaran || '',
        'Catatan Guru': j.hasil_pembelajaran || '',
        'Rencana Tindak Lanjut': j.rencana_tindak_lanjut || '',
        'Status': j.status || '',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [10, 20, 15, 20, 30, 40, 40, 30, 12].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Jurnal Guru');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="JurnalGuru_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
};
exports.downloadExcel = downloadExcel;
