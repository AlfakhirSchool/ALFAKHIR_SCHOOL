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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rekapData = exports.getSiswaDetail = exports.downloadRekap = exports.rekapWaliKelas = exports.bulkKelas = exports.izinBulk = exports.bulkGuru = exports.persiapanGuru = exports.remove = exports.getLaporan = exports.update = exports.manualInput = exports.inputCode = exports.scanQr = exports.closeQrSession = exports.createQrSession = void 0;
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const qrcode_1 = __importDefault(require("qrcode"));
const XLSX = __importStar(require("xlsx"));
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const database_1 = __importDefault(require("../config/database"));
const errorHandler_1 = require("../middleware/errorHandler");
const levelFilter_1 = require("../utils/levelFilter");
const waNotification_1 = require("../utils/waNotification");
const absensiSync_1 = require("../utils/absensiSync");
const logger_1 = __importDefault(require("../config/logger"));
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
        const qr_image = await qrcode_1.default.toDataURL(existingSession.qr_data);
        res.json({ success: true, message: 'Session QR masih aktif', data: { ...existingSession.toJSON(), qr_image } });
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
    const { qr_data, siswa_id, latitude, longitude } = req.body;
    // Backward compat: QR gerbang dikirim ke endpoint ini oleh APK lama
    if (qr_data && qr_data.startsWith('GATE:')) {
        const parts = qr_data.split(':');
        if (parts.length < 4) {
            res.status(400).json({ success: false, message: 'QR code gerbang tidak valid' });
            return;
        }
        const gateMode = parts[1];
        const gateDate = parts[2];
        const gateCode = parts[3];
        const today = new Date().toISOString().split('T')[0];
        if (gateDate !== today) {
            res.status(400).json({ success: false, message: 'QR code sudah kedaluwarsa' });
            return;
        }
        const secret = process.env.GATE_SECRET || 'alfakhir_gate_2025';
        const hash = crypto_1.default.createHash('sha256').update(`${today}:${gateMode}:${secret}`).digest('hex');
        const expectedCode = String(parseInt(hash.slice(0, 8), 16) % 1000000).padStart(6, '0');
        if (gateCode !== expectedCode) {
            res.status(400).json({ success: false, message: 'QR code gerbang tidak valid' });
            return;
        }
        const [siswaRow] = await database_1.default.query(`SELECT s.id AS siswa_id, u.nama AS nama_siswa, k.sekolah_id, sch.nama AS nama_sekolah,
              array_agg(ot.no_telp) FILTER (WHERE ot.no_telp IS NOT NULL) AS ortu_phones
       FROM siswa s JOIN users u ON s.user_id = u.id JOIN kelas k ON s.kelas_id = k.id
       JOIN sekolah sch ON k.sekolah_id = sch.id LEFT JOIN orang_tua ot ON ot.siswa_id = s.id
       WHERE s.id = :sid GROUP BY s.id, u.nama, k.sekolah_id, sch.nama`, { replacements: { sid: siswa_id }, type: sequelize_1.QueryTypes.SELECT });
        if (!siswaRow) {
            res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
            return;
        }
        const now = new Date();
        const col = gateMode === 'masuk' ? 'waktu_masuk' : 'waktu_pulang';
        const upd = gateMode === 'masuk' ? 'waktu_masuk = :now, notif_masuk_sent = FALSE' : 'waktu_pulang = :now, notif_pulang_sent = FALSE';
        await database_1.default.query(`INSERT INTO absensi_gerbang (siswa_id, sekolah_id, tanggal, ${col}, created_by)
       VALUES (:sid, :skId, :today, :now, :uid)
       ON CONFLICT (siswa_id, tanggal) DO UPDATE SET ${upd}`, { replacements: { sid: siswa_id, skId: siswaRow.sekolah_id, today, now, uid: req.user.id }, type: sequelize_1.QueryTypes.INSERT });
        const phones = siswaRow.ortu_phones || [];
        const msg = gateMode === 'masuk'
            ? (0, waNotification_1.buildMasukMessage)(siswaRow.nama_siswa, siswaRow.nama_sekolah, now)
            : (0, waNotification_1.buildPulangMessage)(siswaRow.nama_siswa, siswaRow.nama_sekolah, now);
        for (const p of phones)
            if (p)
                (0, waNotification_1.sendWAMessage)(p, msg).catch(e => logger_1.default.error({ event: 'wa_gate_compat', error: e.message }));
        if (gateMode === 'masuk') {
            const { propagateGerbangToKelas } = await Promise.resolve().then(() => __importStar(require('../utils/absensiSync')));
            propagateGerbangToKelas(siswa_id, today, req.user.id).catch(e => logger_1.default.error({ event: 'propagate_gate_compat_error', error: e.message }));
        }
        res.status(201).json({ success: true, message: `${siswaRow.nama_siswa} berhasil absensi ${gateMode} sekolah!`, data: { nama_siswa: siswaRow.nama_siswa, mode: gateMode, waktu: now } });
        return;
    }
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
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        created_by: req.user.id,
    });
    res.status(201).json({ success: true, message: 'Absensi berhasil dicatat', data: absensi });
};
exports.scanQr = scanQr;
const inputCode = async (req, res) => {
    const { code, siswa_id, latitude, longitude } = req.body;
    const session = await models_1.QrCodeSession.findOne({ where: { unique_code: code, aktif: true } });
    if (!session) {
        res.status(400).json({ success: false, message: 'Kode tidak valid atau session sudah berakhir' });
        return;
    }
    const jadwal_pelajaran_id = session.jadwal_pelajaran_id;
    const tanggal = typeof session.tanggal === 'string' ? session.tanggal : session.tanggal.toISOString().split('T')[0];
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
        latitude: latitude ?? null,
        longitude: longitude ?? null,
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
    if (jadwal_id)
        where.jadwal_pelajaran_id = jadwal_id;
    if (start_date && end_date) {
        where.tanggal = { [sequelize_1.Op.between]: [new Date(start_date), new Date(end_date)] };
    }
    // Filter siswa berdasarkan level admin
    if (siswa_id) {
        where.siswa_id = siswa_id;
    }
    else if (req.user?.school_level) {
        const levelWhere = await (0, levelFilter_1.kelasIdFilter)(req.user.school_level);
        const siswaList = await models_1.Siswa.findAll({ where: levelWhere, attributes: ['id'] });
        where.siswa_id = { [sequelize_1.Op.in]: siswaList.map((s) => s.id) };
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
const remove = async (req, res) => {
    const record = await models_1.Absensi.findByPk(req.params.id);
    if (!record)
        throw (0, errorHandler_1.createError)('Data absensi tidak ditemukan', 404);
    await record.destroy();
    res.json({ success: true, message: 'Data absensi berhasil dihapus' });
};
exports.remove = remove;
// Guru: ambil daftar siswa di jadwal hari ini, auto-fill status dari gate
const persiapanGuru = async (req, res) => {
    const { jadwal_pelajaran_id, tanggal } = req.query;
    if (!jadwal_pelajaran_id)
        throw (0, errorHandler_1.createError)('jadwal_pelajaran_id wajib diisi', 400);
    const tgl = tanggal || new Date().toISOString().split('T')[0];
    const jadwal = await models_1.JadwalPelajaran.findByPk(jadwal_pelajaran_id, {
        include: [
            { model: models_1.Kelas, as: 'kelas' },
            { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
            { model: models_1.Guru, as: 'guru', include: [{ model: models_1.User, as: 'user' }] },
        ],
    });
    if (!jadwal)
        throw (0, errorHandler_1.createError)('Jadwal tidak ditemukan', 404);
    // Ambil semua siswa di kelas + status gate + absensi yg sudah direkam guru
    const rows = await database_1.default.query(`SELECT
       s.id AS siswa_id, u.nama AS nama_siswa, s.nis,
       COALESCE(ag.keterangan_status,
         CASE WHEN ag.waktu_masuk IS NOT NULL THEN 'hadir' ELSE 'alfa' END
       )          AS status_gate,
       ag.keterangan AS ket_gate,
       ab.id      AS absensi_id,
       ab.status  AS status_guru,
       ab.catatan
     FROM siswa s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN absensi_gerbang ag ON ag.siswa_id = s.id AND ag.tanggal = :tgl
     LEFT JOIN absensi ab ON ab.siswa_id = s.id AND ab.jadwal_pelajaran_id = :jid AND ab.tanggal = :tgl
     WHERE s.kelas_id = :kelas_id
     ORDER BY u.nama`, { replacements: { kelas_id: jadwal.kelas_id, jid: jadwal_pelajaran_id, tgl }, type: sequelize_1.QueryTypes.SELECT });
    res.json({ success: true, data: rows, jadwal, tanggal: tgl });
};
exports.persiapanGuru = persiapanGuru;
// Guru: simpan absensi batch per jadwal per hari
const bulkGuru = async (req, res) => {
    const { jadwal_pelajaran_id, tanggal, absensi: listAbsensi } = req.body;
    if (!jadwal_pelajaran_id || !tanggal || !listAbsensi?.length)
        throw (0, errorHandler_1.createError)('Data tidak lengkap', 400);
    for (const item of listAbsensi) {
        await database_1.default.query(`INSERT INTO absensi (id, siswa_id, jadwal_pelajaran_id, tanggal, status, catatan, waktu_hadir, qr_code_scanned, created_by, created_at)
       VALUES (gen_random_uuid(), :siswa_id, :jid, :tgl, :status, :catatan, :waktu, false, :uid, NOW())
       ON CONFLICT (siswa_id, jadwal_pelajaran_id, tanggal) DO UPDATE SET
         status = EXCLUDED.status, catatan = EXCLUDED.catatan, waktu_hadir = EXCLUDED.waktu_hadir`, { replacements: { siswa_id: item.siswa_id, jid: jadwal_pelajaran_id, tgl: tanggal, status: item.status, catatan: item.catatan || null, waktu: item.status === 'hadir' ? new Date() : null, uid: req.user.id }, type: sequelize_1.QueryTypes.INSERT });
    }
    // Propagate siswa yang hadir ke absensi_gerbang (waktu_masuk) jika belum ada
    const hadirIds = listAbsensi.filter(i => i.status === 'hadir').map(i => i.siswa_id);
    if (hadirIds.length) {
        (0, absensiSync_1.propagateKelasToGerbang)(hadirIds, tanggal, req.user.id).catch(e => logger_1.default.error({ event: 'propagate_kelas_to_gerbang_error', error: e.message }));
    }
    try {
        await database_1.default.query(`INSERT INTO activity_log (user_id, action, table_name, new_value) VALUES (:uid, 'bulk_absensi_guru', 'absensi', :val::jsonb)`, { replacements: { uid: req.user.id, val: JSON.stringify({ jadwal_pelajaran_id, tanggal, jumlah: listAbsensi.length }) }, type: sequelize_1.QueryTypes.INSERT });
    }
    catch (_) { }
    res.json({ success: true, message: `${listAbsensi.length} absensi berhasil disimpan` });
};
exports.bulkGuru = bulkGuru;
// Guru/Admin: set izin untuk satu siswa — bisa ke semua jadwal hari itu atau satu jadwal saja
const izinBulk = async (req, res) => {
    const { siswa_id, tanggal, catatan, semua_jadwal, jadwal_pelajaran_id } = req.body;
    if (!siswa_id || !tanggal || semua_jadwal === undefined) {
        throw (0, errorHandler_1.createError)('siswa_id, tanggal, dan semua_jadwal wajib diisi', 400);
    }
    if (!semua_jadwal && !jadwal_pelajaran_id) {
        throw (0, errorHandler_1.createError)('jadwal_pelajaran_id wajib jika semua_jadwal=false', 400);
    }
    const result = await (0, absensiSync_1.setIzin)({
        siswa_id,
        tanggal,
        catatan: catatan || null,
        semua_jadwal,
        jadwal_pelajaran_id: jadwal_pelajaran_id || null,
        created_by: req.user.id,
    });
    const msg = semua_jadwal
        ? `Izin dicatat untuk ${result.jadwal_count} jadwal pelajaran`
        : 'Izin dicatat untuk 1 jadwal pelajaran';
    res.json({ success: true, message: msg, data: result });
};
exports.izinBulk = izinBulk;
// Admin: bulk absensi seluruh kelas → propagate ke semua jadwal hari itu
const bulkKelas = async (req, res) => {
    const { kelas_id, tanggal, absensi: listAbsensi } = req.body;
    if (!kelas_id || !tanggal || !listAbsensi?.length)
        throw (0, errorHandler_1.createError)('Data tidak lengkap', 400);
    const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const hariIni = HARI[new Date(tanggal).getDay()];
    const jadwalList = await models_1.JadwalPelajaran.findAll({ where: { kelas_id, hari: hariIni } });
    if (!jadwalList.length)
        throw (0, errorHandler_1.createError)(`Tidak ada jadwal untuk hari ${hariIni}`, 400);
    let count = 0;
    for (const jadwal of jadwalList) {
        for (const item of listAbsensi) {
            await database_1.default.query(`INSERT INTO absensi (id, siswa_id, jadwal_pelajaran_id, tanggal, status, catatan, waktu_hadir, qr_code_scanned, created_by, created_at)
         VALUES (gen_random_uuid(), :siswa_id, :jid, :tgl, :status, :catatan, :waktu, false, :uid, NOW())
         ON CONFLICT (siswa_id, jadwal_pelajaran_id, tanggal) DO UPDATE SET
           status = EXCLUDED.status, catatan = EXCLUDED.catatan, waktu_hadir = EXCLUDED.waktu_hadir`, { replacements: { siswa_id: item.siswa_id, jid: jadwal.id, tgl: tanggal, status: item.status, catatan: item.catatan || null, waktu: item.status === 'hadir' ? new Date() : null, uid: req.user.id }, type: sequelize_1.QueryTypes.INSERT });
            count++;
        }
    }
    res.json({ success: true, message: `${listAbsensi.length} siswa × ${jadwalList.length} jadwal = ${count} absensi disimpan` });
};
exports.bulkKelas = bulkKelas;
// Wali kelas: rekap kelas yang diampu untuk tanggal tertentu
const rekapWaliKelas = async (req, res) => {
    const { tanggal } = req.query;
    const tgl = tanggal || new Date().toISOString().split('T')[0];
    // Cari guru dari user yang login
    const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
    if (!guru)
        throw (0, errorHandler_1.createError)('Data guru tidak ditemukan', 404);
    // Cari kelas di mana guru ini adalah wali kelas
    const kelas = await models_1.Kelas.findOne({ where: { wali_kelas_id: guru.id } });
    if (!kelas)
        throw (0, errorHandler_1.createError)('Anda tidak terdaftar sebagai wali kelas', 404);
    const rows = await database_1.default.query(`SELECT
       s.id AS siswa_id, u.nama AS nama_siswa, s.nis,
       COALESCE(ag.keterangan_status,
         CASE WHEN ag.waktu_masuk IS NOT NULL THEN 'hadir' ELSE 'alfa' END
       )              AS status,
       ag.waktu_masuk,
       ag.keterangan,
       ag.lokasi_valid,
       ag.lokasi_jarak_meter
     FROM siswa s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN absensi_gerbang ag ON ag.siswa_id = s.id AND ag.tanggal = :tgl
     WHERE s.kelas_id = :kelas_id
     ORDER BY u.nama`, { replacements: { kelas_id: kelas.id, tgl }, type: sequelize_1.QueryTypes.SELECT });
    const summary = { hadir: 0, sakit: 0, izin: 0, alfa: 0 };
    rows.forEach((r) => { if (r.status in summary)
        summary[r.status]++; });
    res.json({ success: true, kelas, data: rows, summary, tanggal: tgl });
};
exports.rekapWaliKelas = rekapWaliKelas;
const downloadRekap = async (req, res) => {
    const { kelas_id, bulan, tahun } = req.query;
    const b = parseInt(bulan) || new Date().getMonth() + 1;
    const y = parseInt(tahun) || new Date().getFullYear();
    const kelas = await models_1.Kelas.findByPk(kelas_id, { include: [{ model: models_1.Sekolah, as: 'sekolah' }] });
    if (!kelas)
        throw (0, errorHandler_1.createError)('Kelas tidak ditemukan', 404);
    const startDate = new Date(y, b - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(y, b, 0).toISOString().split('T')[0];
    const daysInMonth = new Date(y, b, 0).getDate();
    const namaBulan = new Date(y, b - 1, 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const siswaList = await database_1.default.query(`SELECT s.id, u.nama, s.nis FROM siswa s JOIN users u ON s.user_id = u.id WHERE s.kelas_id = :kelas_id ORDER BY u.nama`, { replacements: { kelas_id }, type: sequelize_1.QueryTypes.SELECT });
    const mapelList = await database_1.default.query(`SELECT DISTINCT mp.id, mp.nama FROM mata_pelajaran mp
     JOIN jadwal_pelajaran jp ON jp.mata_pelajaran_id = mp.id
     WHERE jp.kelas_id = :kelas_id ORDER BY mp.nama`, { replacements: { kelas_id }, type: sequelize_1.QueryTypes.SELECT });
    const rows = await database_1.default.query(`SELECT a.siswa_id, mp.id AS mapel_id,
            EXTRACT(DAY FROM a.tanggal::date)::int AS tgl, a.status
     FROM absensi a
     JOIN jadwal_pelajaran jp ON a.jadwal_pelajaran_id = jp.id
     JOIN mata_pelajaran mp ON jp.mata_pelajaran_id = mp.id
     WHERE jp.kelas_id = :kelas_id AND a.tanggal BETWEEN :start AND :end`, { replacements: { kelas_id, start: startDate, end: endDate }, type: sequelize_1.QueryTypes.SELECT });
    // byMapel[mapel_id][siswa_id][tgl] = status
    const byMapel = {};
    for (const r of rows) {
        if (!byMapel[r.mapel_id])
            byMapel[r.mapel_id] = {};
        if (!byMapel[r.mapel_id][r.siswa_id])
            byMapel[r.mapel_id][r.siswa_id] = {};
        byMapel[r.mapel_id][r.siswa_id][r.tgl] = r.status;
    }
    const namaSekolah = kelas.sekolah?.nama || 'Al Fakhir School';
    const wb = XLSX.utils.book_new();
    const totalCols = 3 + daysInMonth + 4;
    const buildSheet = (mapelNama, dayMap) => {
        const titleRow = [`STUDENT ATTENDANCE LIST - ${namaSekolah} - ${kelas.nama} - ${mapelNama} - ${namaBulan}`];
        const headerRow = ['No', 'STUDENT NAME', 'M/F'];
        for (let d = 1; d <= daysInMonth; d++)
            headerRow.push(d);
        headerRow.push('H', 'S', 'I', 'A');
        const dayRow = ['', 'DAY →', ''];
        for (let d = 1; d <= daysInMonth; d++)
            dayRow.push(DAY_NAMES[new Date(y, b - 1, d).getDay()]);
        dayRow.push('', 'SUMMARY', '', '');
        const dataRows = [titleRow, headerRow, dayRow];
        const totalPerDay = {};
        let no = 1, totH = 0, totS = 0, totI = 0, totA = 0;
        for (const s of siswaList) {
            const sdays = dayMap[s.id] || {};
            const row = [no++, s.nama, '-'];
            let H = 0, S = 0, I = 0, A = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                const dow = new Date(y, b - 1, d).getDay();
                if (dow === 0) {
                    row.push('—');
                    continue;
                }
                const st = sdays[d];
                if (!st) {
                    row.push('');
                }
                else if (st === 'hadir') {
                    row.push('H');
                    H++;
                    totalPerDay[d] = (totalPerDay[d] || 0) + 1;
                }
                else if (st === 'sakit') {
                    row.push('S');
                    S++;
                }
                else if (st === 'izin') {
                    row.push('I');
                    I++;
                }
                else {
                    row.push('A');
                    A++;
                }
            }
            row.push(H, S, I, A);
            totH += H;
            totS += S;
            totI += I;
            totA += A;
            dataRows.push(row);
        }
        const totalRow = ['', 'TOTAL PRESENT', ''];
        for (let d = 1; d <= daysInMonth; d++) {
            const dow = new Date(y, b - 1, d).getDay();
            totalRow.push(dow === 0 ? '—' : (totalPerDay[d] || 0));
        }
        totalRow.push(totH, totS, totI, totA);
        dataRows.push(totalRow);
        const ws = XLSX.utils.aoa_to_sheet(dataRows);
        ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 5 }, ...Array(daysInMonth).fill({ wch: 4 }), { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }];
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];
        return ws;
    };
    if (mapelList.length === 0) {
        // Fallback: single sheet no mapel data
        const ws = buildSheet('SEMUA', {});
        XLSX.utils.book_append_sheet(wb, ws, `Rekap ${namaBulan}`);
    }
    else {
        for (const mp of mapelList) {
            const ws = buildSheet(mp.nama, byMapel[mp.id] || {});
            const sheetName = mp.nama.substring(0, 31); // Excel max 31 chars
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
    }
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Absensi_${kelas.nama.replace(/\s+/g, '_')}_${namaBulan.replace(/\s+/g, '_')}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
};
exports.downloadRekap = downloadRekap;
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
// JSON data untuk preview rekap absensi per mata pelajaran
const rekapData = async (req, res) => {
    const { kelas_id, bulan, tahun } = req.query;
    const b = parseInt(bulan) || new Date().getMonth() + 1;
    const y = parseInt(tahun) || new Date().getFullYear();
    const kelas = await models_1.Kelas.findByPk(kelas_id, { include: [{ model: models_1.Sekolah, as: 'sekolah' }] });
    if (!kelas)
        throw (0, errorHandler_1.createError)('Kelas tidak ditemukan', 404);
    const startDate = new Date(y, b - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(y, b, 0).toISOString().split('T')[0];
    const daysInMonth = new Date(y, b, 0).getDate();
    // Ambil semua siswa di kelas
    const siswaList = await database_1.default.query(`SELECT s.id, u.nama, s.nis FROM siswa s JOIN users u ON s.user_id = u.id WHERE s.kelas_id = :kelas_id ORDER BY u.nama`, { replacements: { kelas_id }, type: sequelize_1.QueryTypes.SELECT });
    // Ambil semua mata pelajaran yang punya jadwal di kelas ini
    const mapelList = await database_1.default.query(`SELECT DISTINCT mp.id, mp.nama FROM mata_pelajaran mp
     JOIN jadwal_pelajaran jp ON jp.mata_pelajaran_id = mp.id
     WHERE jp.kelas_id = :kelas_id ORDER BY mp.nama`, { replacements: { kelas_id }, type: sequelize_1.QueryTypes.SELECT });
    // Ambil semua absensi kelas bulan ini per mapel
    const rows = await database_1.default.query(`SELECT a.siswa_id, mp.id AS mapel_id, mp.nama AS mapel_nama,
            EXTRACT(DAY FROM a.tanggal::date)::int AS tgl, a.status
     FROM absensi a
     JOIN jadwal_pelajaran jp ON a.jadwal_pelajaran_id = jp.id
     JOIN mata_pelajaran mp ON jp.mata_pelajaran_id = mp.id
     WHERE jp.kelas_id = :kelas_id AND a.tanggal BETWEEN :start AND :end`, { replacements: { kelas_id, start: startDate, end: endDate }, type: sequelize_1.QueryTypes.SELECT });
    // Bangun struktur: mapel → siswa → { tgl: status }
    const byMapel = {};
    for (const r of rows) {
        if (!byMapel[r.mapel_id])
            byMapel[r.mapel_id] = {};
        if (!byMapel[r.mapel_id][r.siswa_id])
            byMapel[r.mapel_id][r.siswa_id] = {};
        byMapel[r.mapel_id][r.siswa_id][r.tgl] = r.status;
    }
    const days = Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const dow = new Date(y, b - 1, d).getDay();
        return { tgl: d, hari: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dow], libur: dow === 0 };
    });
    const mapelData = mapelList.map(mp => ({
        id: mp.id,
        nama: mp.nama,
        siswa: siswaList.map(s => {
            const dayMap = byMapel[mp.id]?.[s.id] || {};
            let H = 0, S = 0, I = 0, A = 0;
            const absensi = {};
            for (const day of days) {
                if (!day.libur) {
                    const st = dayMap[day.tgl];
                    absensi[day.tgl] = st || '';
                    if (st === 'hadir')
                        H++;
                    else if (st === 'sakit')
                        S++;
                    else if (st === 'izin')
                        I++;
                    else if (st === 'alfa')
                        A++;
                }
            }
            return { id: s.id, nama: s.nama, nis: s.nis, absensi, H, S, I, A };
        }),
    }));
    res.json({
        success: true,
        data: {
            kelas: kelas.nama,
            namaSekolah: kelas.sekolah?.nama || 'Al Fakhir School',
            bulan: b,
            tahun: y,
            namaBulan: new Date(y, b - 1, 1).toLocaleString('id-ID', { month: 'long' }),
            days,
            mapel: mapelData,
        },
    });
};
exports.rekapData = rekapData;
