"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.importCsv = exports.syncFromSheets = exports.create = exports.getById = exports.getAll = exports.getSekolahList = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const errorHandler_1 = require("../middleware/errorHandler");
const levelFilter_1 = require("../utils/levelFilter");
const getSekolahList = async (_req, res) => {
    const list = await models_1.Sekolah.findAll({ attributes: ['id', 'nama', 'jenjang'], order: [['nama', 'ASC']] });
    res.json({ success: true, data: list });
};
exports.getSekolahList = getSekolahList;
const getAll = async (req, res) => {
    const { kelas_id, tahun_ajaran, search, page = '1', limit = '20', jenjang } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const levelWhere = await (0, levelFilter_1.kelasIdFilter)(req.user?.school_level);
    const where = { ...levelWhere };
    if (kelas_id)
        where.kelas_id = kelas_id;
    const kelasWhere = {};
    if (tahun_ajaran)
        kelasWhere.tahun_ajaran = tahun_ajaran;
    const sekolahWhere = {};
    if (jenjang)
        sekolahWhere.level = jenjang;
    const userWhere = {};
    if (search) {
        userWhere.nama = { [sequelize_1.Op.iLike]: `%${search}%` };
    }
    const { count, rows } = await models_1.Siswa.findAndCountAll({
        where,
        include: [
            { model: models_1.User, as: 'user', where: userWhere, attributes: { exclude: ['password_hash'] } },
            { model: models_1.Kelas, as: 'kelas', where: kelasWhere, required: true, include: [{ model: models_1.Sekolah, as: 'sekolah', where: Object.keys(sekolahWhere).length ? sekolahWhere : undefined }] },
        ],
        limit: parseInt(limit),
        offset,
        order: [['nisn', 'ASC']],
    });
    res.json({
        success: true,
        data: rows,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) },
    });
};
exports.getAll = getAll;
const getById = async (req, res) => {
    const siswa = await models_1.Siswa.findByPk(req.params.id, {
        include: [
            { model: models_1.User, as: 'user', attributes: { exclude: ['password_hash'] } },
            { model: models_1.Kelas, as: 'kelas', include: [{ model: models_1.Sekolah, as: 'sekolah' }] },
        ],
    });
    if (!siswa)
        throw (0, errorHandler_1.createError)('Siswa tidak ditemukan', 404);
    res.json({ success: true, data: siswa });
};
exports.getById = getById;
const create = async (req, res) => {
    const { email, password, nama, nisn, nis, no_induk, kelas_id, tempat_lahir, tanggal_lahir, alamat, jenis_kelamin } = req.body;
    const autoEmail = email || `${nis}@siswa.alfakhir.sch.id`;
    const autoPassword = password || nis.slice(-4);
    const existing = await models_1.User.findOne({ where: { email: autoEmail } });
    if (existing) {
        res.status(400).json({ success: false, message: 'NIS sudah terdaftar' });
        return;
    }
    const finalNisn = nisn || nis;
    const existingNisn = await models_1.Siswa.findOne({ where: { nisn: finalNisn } });
    if (existingNisn) {
        res.status(400).json({ success: false, message: nisn ? 'NISN sudah terdaftar' : 'NIS sudah terdaftar sebagai siswa' });
        return;
    }
    const password_hash = await bcrypt_1.default.hash(autoPassword, 10);
    const user = await models_1.User.create({ email: autoEmail, password_hash, nama, role: 'siswa', password_default: autoPassword });
    const siswa = await models_1.Siswa.create({ user_id: user.id, kelas_id, nisn: finalNisn, nis, no_induk: no_induk || nis, tempat_lahir, tanggal_lahir, alamat, jenis_kelamin: jenis_kelamin || null });
    // Kirim ke n8n async — tidak block response
    const webhookUrl = process.env.N8N_WEBHOOK_SISWA;
    if (webhookUrl) {
        const kelasData = await models_1.Kelas.findByPk(kelas_id, { include: [{ model: models_1.Sekolah, as: 'sekolah' }] });
        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nama,
                nis,
                nisn: nisn || '',
                login: nis,
                password_default: autoPassword,
                kelas: kelasData?.nama || '',
                jenjang: kelasData?.sekolah?.jenjang || '',
                sekolah: kelasData?.sekolah?.nama || '',
                tanggal_dibuat: new Date().toISOString(),
            }),
        }).catch(() => { });
    }
    res.status(201).json({ success: true, message: 'Siswa berhasil dibuat', data: { user, siswa } });
};
exports.create = create;
const SHEET_ID = '1NaxhH1ORhzYGms_o98miCFxqoZCi8xRrciicPt5XHGw';
const SHEET_TABS = [
    { nama: 'SD', gid: '0' },
    { nama: 'SMP', gid: '2540234' },
    { nama: 'SMA', gid: process.env.SHEET_SMA_GID || '1861647558' },
];
async function fetchSheetCsv(gid) {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok)
        throw new Error(`HTTP ${res.status}`);
    return res.text();
}
function parseCsvRows(csv) {
    const lines = csv.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2)
        return [];
    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''));
    return lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const obj = {};
        header.forEach((h, i) => { obj[h] = cols[i] || ''; });
        const jk = (obj['jk'] || obj['jenis_kelamin'] || '').toUpperCase().trim();
        return { nama: obj['nama'] || '', kelas_nama: obj['kelas'] || '', nis: obj['nis'] || '', status: obj['status'] || 'AKTIF', jenis_kelamin: jk === 'L' || jk === 'P' ? jk : null };
    }).filter(r => r.nama);
}
async function doImportRows(rows) {
    const results = [];
    for (const [idx, row] of rows.entries()) {
        const { nama, kelas_nama } = row;
        let { nis } = row;
        if (!nama || !kelas_nama) {
            results.push({ nama: nama || '?', nis: nis || '?', status: 'skipped', reason: 'Data tidak lengkap' });
            continue;
        }
        // Coba exact match dulu, fallback ke contains search
        let kelas = await models_1.Kelas.findOne({ where: { nama: { [sequelize_1.Op.iLike]: kelas_nama } } });
        if (!kelas)
            kelas = await models_1.Kelas.findOne({ where: { nama: { [sequelize_1.Op.iLike]: `%${kelas_nama}%` } } });
        if (!kelas) {
            results.push({ nama, nis: nis || '', status: 'skipped', reason: `Kelas "${kelas_nama}" tidak ditemukan` });
            continue;
        }
        // Cek duplikat nama di kelas yang sama
        const existingByNama = await models_1.Siswa.findOne({ where: { kelas_id: kelas.id }, include: [{ model: models_1.User, as: 'user', where: { nama: { [sequelize_1.Op.iLike]: nama } } }] });
        if (existingByNama) {
            results.push({ nama, nis: nis || '', status: 'skipped', reason: `Siswa "${nama}" sudah ada di kelas ${kelas.nama}` });
            continue;
        }
        if (nis) {
            if (await models_1.User.findOne({ where: { email: `${nis}@siswa.alfakhir.sch.id` } })) {
                results.push({ nama, nis, status: 'skipped', reason: 'NIS sudah terdaftar' });
                continue;
            }
            if (await models_1.Siswa.findOne({ where: { nis } })) {
                results.push({ nama, nis, status: 'skipped', reason: 'NIS sudah terdaftar' });
                continue;
            }
        }
        const namaSlug = nama.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
        const autoEmail = nis ? `${nis}@siswa.alfakhir.sch.id` : `${namaSlug}.${Date.now()}@siswa.alfakhir.sch.id`;
        const autoPassword = nis ? nis.slice(-4) : Math.random().toString(36).slice(-4);
        const is_active = !row.status || row.status.toUpperCase() !== 'TIDAK AKTIF';
        const password_hash = await bcrypt_1.default.hash(autoPassword, 10);
        const user = await models_1.User.create({ email: autoEmail, password_hash, nama, role: 'siswa', password_default: nis ? autoPassword : null, is_active });
        await models_1.Siswa.create({ user_id: user.id, kelas_id: kelas.id, nisn: nis || null, nis: nis || null, no_induk: nis || null, jenis_kelamin: row.jenis_kelamin || null });
        results.push({ nama, nis, status: 'created' });
    }
    return results;
}
const syncFromSheets = async (_req, res) => {
    try {
        const allRows = [];
        for (const tab of SHEET_TABS) {
            try {
                const csv = await fetchSheetCsv(tab.gid);
                allRows.push(...parseCsvRows(csv));
            }
            catch (e) {
                // skip tab jika gagal fetch
            }
        }
        if (allRows.length === 0) {
            res.json({ success: true, message: 'Tidak ada data baru di spreadsheet', data: [] });
            return;
        }
        const results = await doImportRows(allRows);
        const created = results.filter(r => r.status === 'created').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        res.json({ success: true, message: `${created} siswa ditambahkan, ${skipped} dilewati`, data: results });
    }
    catch (e) {
        res.status(500).json({ success: false, message: `Gagal sync: ${e?.message || 'Error tidak diketahui'}` });
    }
};
exports.syncFromSheets = syncFromSheets;
const importCsv = async (req, res) => {
    try {
        const { rows } = req.body;
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            res.status(400).json({ success: false, message: 'Data kosong' });
            return;
        }
        const results = await doImportRows(rows);
        const created = results.filter(r => r.status === 'created').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        res.json({ success: true, message: `${created} siswa ditambahkan, ${skipped} dilewati`, data: results });
    }
    catch (e) {
        res.status(500).json({ success: false, message: `Gagal import: ${e?.message || 'Error tidak diketahui'}` });
    }
};
exports.importCsv = importCsv;
const update = async (req, res) => {
    const siswa = await models_1.Siswa.findByPk(req.params.id, { include: [{ model: models_1.User, as: 'user' }] });
    if (!siswa)
        throw (0, errorHandler_1.createError)('Siswa tidak ditemukan', 404);
    const { nama, email, kelas_id, nisn, nis, no_induk, tempat_lahir, tanggal_lahir, alamat, is_active, jenis_kelamin } = req.body;
    const userUpdate = {};
    if (nama !== undefined)
        userUpdate.nama = nama;
    if (email !== undefined)
        userUpdate.email = email;
    if (is_active !== undefined)
        userUpdate.is_active = is_active;
    if (Object.keys(userUpdate).length)
        await siswa.user.update(userUpdate);
    const siswaUpdate = {};
    if (kelas_id !== undefined)
        siswaUpdate.kelas_id = kelas_id;
    if (nisn !== undefined)
        siswaUpdate.nisn = nisn;
    if (nis !== undefined)
        siswaUpdate.nis = nis;
    if (no_induk !== undefined)
        siswaUpdate.no_induk = no_induk;
    if (tempat_lahir !== undefined)
        siswaUpdate.tempat_lahir = tempat_lahir;
    if (tanggal_lahir !== undefined)
        siswaUpdate.tanggal_lahir = tanggal_lahir;
    if (alamat !== undefined)
        siswaUpdate.alamat = alamat;
    if (jenis_kelamin !== undefined)
        siswaUpdate.jenis_kelamin = jenis_kelamin || null;
    if (Object.keys(siswaUpdate).length)
        await siswa.update(siswaUpdate);
    res.json({ success: true, message: 'Data siswa berhasil diperbarui' });
};
exports.update = update;
const remove = async (req, res) => {
    const siswa = await models_1.Siswa.findByPk(req.params.id, { include: [{ model: models_1.User, as: 'user' }] });
    if (!siswa)
        throw (0, errorHandler_1.createError)('Siswa tidak ditemukan', 404);
    await siswa.user.update({ is_active: false });
    res.json({ success: true, message: 'Siswa berhasil dinonaktifkan' });
};
exports.remove = remove;
