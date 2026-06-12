"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSiswaDetail = exports.getLaporan = exports.update = exports.manualInput = exports.inputCode = exports.scanQr = exports.closeQrSession = exports.createQrSession = void 0;
const uuid_1 = require("uuid");
const qrcode_1 = __importDefault(require("qrcode"));
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const errorHandler_1 = require("../middleware/errorHandler");
const generateUniqueCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
const createQrSession = async (req, res) => {
    const { jadwal_pelajaran_id, tanggal } = req.body;
    const jadwal = await models_1.JadwalPelajaran.findByPk(jadwal_pelajaran_id, {
        include: [
            { model: models_1.Guru, as: 'guru', include: [{ model: models_1.User, as: 'user' }] },
            { model: models_1.Kelas, as: 'kelas' },
            { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
        ],
    });
    if (!jadwal)
        throw (0, errorHandler_1.createError)('Jadwal tidak ditemukan', 404);
    const existingSession = await models_1.QrCodeSession.findOne({
        where: { jadwal_pelajaran_id, tanggal, aktif: true },
    });
    if (existingSession) {
        res.json({ success: true, message: 'Session QR masih aktif', data: existingSession });
        return;
    }
    const unique_code = generateUniqueCode();
    const sessionId = (0, uuid_1.v4)();
    const qr_data = JSON.stringify({ session_id: sessionId, code: unique_code, jadwal_id: jadwal_pelajaran_id, tanggal });
    const qr_image = await qrcode_1.default.toDataURL(qr_data);
    const session = await models_1.QrCodeSession.create({
        id: sessionId,
        jadwal_pelajaran_id,
        tanggal: new Date(tanggal),
        unique_code,
        qr_data,
        aktif: true,
        waktu_mulai: new Date(),
    });
    res.status(201).json({
        success: true,
        data: { ...session.toJSON(), qr_image, jadwal },
    });
};
exports.createQrSession = createQrSession;
const closeQrSession = async (req, res) => {
    const session = await models_1.QrCodeSession.findByPk(req.params.id);
    if (!session)
        throw (0, errorHandler_1.createError)('Session tidak ditemukan', 404);
    await session.update({ aktif: false, waktu_selesai: new Date() });
    res.json({ success: true, message: 'Session QR ditutup' });
};
exports.closeQrSession = closeQrSession;
const scanQr = async (req, res) => {
    const { qr_data, siswa_id } = req.body;
    let parsedQr;
    try {
        parsedQr = JSON.parse(qr_data);
    }
    catch {
        res.status(400).json({ success: false, message: 'QR code tidak valid' });
        return;
    }
    const session = await models_1.QrCodeSession.findByPk(parsedQr.session_id);
    if (!session || !session.aktif) {
        res.status(400).json({ success: false, message: 'Session QR tidak aktif atau sudah berakhir' });
        return;
    }
    const existing = await models_1.Absensi.findOne({
        where: { siswa_id, jadwal_pelajaran_id: parsedQr.jadwal_id, tanggal: parsedQr.tanggal },
    });
    if (existing) {
        res.status(400).json({ success: false, message: 'Absensi sudah tercatat' });
        return;
    }
    const absensi = await models_1.Absensi.create({
        siswa_id,
        jadwal_pelajaran_id: parsedQr.jadwal_id,
        tanggal: new Date(parsedQr.tanggal),
        waktu_hadir: new Date(),
        status: 'hadir',
        qr_code_scanned: true,
        created_by: req.user.id,
    });
    res.status(201).json({ success: true, message: 'Absensi berhasil dicatat', data: absensi });
};
exports.scanQr = scanQr;
const inputCode = async (req, res) => {
    const { code, siswa_id, jadwal_pelajaran_id, tanggal } = req.body;
    const session = await models_1.QrCodeSession.findOne({
        where: { jadwal_pelajaran_id, tanggal, aktif: true, unique_code: code },
    });
    if (!session) {
        res.status(400).json({ success: false, message: 'Kode tidak valid atau session sudah berakhir' });
        return;
    }
    const existing = await models_1.Absensi.findOne({ where: { siswa_id, jadwal_pelajaran_id, tanggal } });
    if (existing) {
        res.status(400).json({ success: false, message: 'Absensi sudah tercatat' });
        return;
    }
    const absensi = await models_1.Absensi.create({
        siswa_id,
        jadwal_pelajaran_id,
        tanggal: new Date(tanggal),
        waktu_hadir: new Date(),
        status: 'hadir',
        qr_code_scanned: false,
        input_code: code,
        created_by: req.user.id,
    });
    res.status(201).json({ success: true, message: 'Absensi berhasil dicatat', data: absensi });
};
exports.inputCode = inputCode;
const manualInput = async (req, res) => {
    const { siswa_id, jadwal_pelajaran_id, tanggal, status, catatan } = req.body;
    const existing = await models_1.Absensi.findOne({ where: { siswa_id, jadwal_pelajaran_id, tanggal } });
    if (existing) {
        await existing.update({ status, catatan, created_by: req.user.id });
        res.json({ success: true, message: 'Absensi berhasil diperbarui', data: existing });
        return;
    }
    const absensi = await models_1.Absensi.create({
        siswa_id,
        jadwal_pelajaran_id,
        tanggal: new Date(tanggal),
        status,
        catatan,
        created_by: req.user.id,
    });
    res.status(201).json({ success: true, message: 'Absensi berhasil dicatat', data: absensi });
};
exports.manualInput = manualInput;
const update = async (req, res) => {
    const absensi = await models_1.Absensi.findByPk(req.params.id);
    if (!absensi)
        throw (0, errorHandler_1.createError)('Absensi tidak ditemukan', 404);
    await absensi.update({ status: req.body.status, catatan: req.body.catatan });
    res.json({ success: true, message: 'Absensi berhasil diperbarui', data: absensi });
};
exports.update = update;
const getLaporan = async (req, res) => {
    const { siswa_id, jadwal_id, start_date, end_date } = req.query;
    const where = {};
    if (siswa_id)
        where.siswa_id = siswa_id;
    if (jadwal_id)
        where.jadwal_pelajaran_id = jadwal_id;
    if (start_date && end_date) {
        where.tanggal = { [sequelize_1.Op.between]: [new Date(start_date), new Date(end_date)] };
    }
    const absensiList = await models_1.Absensi.findAll({
        where,
        include: [
            { model: models_1.Siswa, as: 'siswa', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
            { model: models_1.JadwalPelajaran, as: 'jadwal', include: [{ model: models_1.MataPelajaran, as: 'mata_pelajaran' }] },
        ],
        order: [['tanggal', 'DESC']],
    });
    const summary = {
        hadir: absensiList.filter(a => a.status === 'hadir').length,
        sakit: absensiList.filter(a => a.status === 'sakit').length,
        izin: absensiList.filter(a => a.status === 'izin').length,
        alfa: absensiList.filter(a => a.status === 'alfa').length,
        total: absensiList.length,
    };
    res.json({ success: true, data: absensiList, summary });
};
exports.getLaporan = getLaporan;
const getSiswaDetail = async (req, res) => {
    const { bulan, tahun } = req.query;
    const where = { siswa_id: req.params.siswa_id };
    if (bulan && tahun) {
        const startDate = new Date(parseInt(tahun), parseInt(bulan) - 1, 1);
        const endDate = new Date(parseInt(tahun), parseInt(bulan), 0);
        where.tanggal = { [sequelize_1.Op.between]: [startDate, endDate] };
    }
    const absensiList = await models_1.Absensi.findAll({
        where,
        include: [{ model: models_1.JadwalPelajaran, as: 'jadwal', include: [{ model: models_1.MataPelajaran, as: 'mata_pelajaran' }] }],
        order: [['tanggal', 'DESC']],
    });
    res.json({ success: true, data: absensiList });
};
exports.getSiswaDetail = getSiswaDetail;
