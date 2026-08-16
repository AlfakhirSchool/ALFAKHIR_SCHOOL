"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLaporan = exports.remove = exports.update = exports.getSiswa = exports.create = void 0;
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const Nilai_1 = require("../models/Nilai");
const errorHandler_1 = require("../middleware/errorHandler");
const levelFilter_1 = require("../utils/levelFilter");
const create = async (req, res) => {
    const { siswa_id, mata_pelajaran_id, semester, tahun_ajaran, kuis, tugas, uts, uas, catatan } = req.body;
    const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
    if (!guru && req.user.role !== 'admin')
        throw (0, errorHandler_1.createError)('Data guru tidak ditemukan', 404);
    const existing = await models_1.Nilai.findOne({ where: { siswa_id, mata_pelajaran_id, semester, tahun_ajaran } });
    let nilaiAkhir = null;
    let gradeInfo = null;
    if (kuis !== undefined && tugas !== undefined && uts !== undefined && uas !== undefined) {
        nilaiAkhir = (0, Nilai_1.hitungNilaiAkhir)(kuis, tugas, uts, uas);
        gradeInfo = (0, Nilai_1.hitungGrade)(nilaiAkhir);
    }
    if (existing) {
        await existing.update({
            kuis, tugas, uts, uas,
            nilai_akhir: nilaiAkhir,
            grade: gradeInfo?.grade || null,
            predikat: gradeInfo?.predikat || null,
            catatan,
            update_date: new Date(),
        });
        res.json({ success: true, message: 'Nilai berhasil diperbarui', data: existing });
        return;
    }
    const nilai = await models_1.Nilai.create({
        siswa_id,
        mata_pelajaran_id,
        guru_id: guru?.id || req.user.id,
        semester,
        tahun_ajaran,
        kuis, tugas, uts, uas,
        nilai_akhir: nilaiAkhir,
        grade: gradeInfo?.grade || null,
        predikat: gradeInfo?.predikat || null,
        catatan,
        input_date: new Date(),
    });
    res.status(201).json({ success: true, message: 'Nilai berhasil disimpan', data: nilai });
};
exports.create = create;
const getSiswa = async (req, res) => {
    if (req.user.role === 'siswa') {
        const siswa = await models_1.Siswa.findOne({ where: { user_id: req.user.id } });
        if (!siswa || siswa.id !== req.params.siswa_id)
            throw (0, errorHandler_1.createError)('Akses ditolak', 403);
    }
    const { semester, tahun_ajaran } = req.query;
    const where = { siswa_id: req.params.siswa_id };
    if (semester)
        where.semester = semester;
    if (tahun_ajaran)
        where.tahun_ajaran = tahun_ajaran;
    const nilaiList = await models_1.Nilai.findAll({
        where,
        include: [
            { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
            { model: models_1.Guru, as: 'guru', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
        ],
        order: [['mata_pelajaran', 'nama', 'ASC']],
    });
    const rataRata = nilaiList.reduce((sum, n) => sum + (n.nilai_akhir || 0), 0) / (nilaiList.length || 1);
    res.json({ success: true, data: nilaiList, rata_rata: Math.round(rataRata * 100) / 100 });
};
exports.getSiswa = getSiswa;
const update = async (req, res) => {
    const nilai = await models_1.Nilai.findByPk(req.params.id);
    if (!nilai)
        throw (0, errorHandler_1.createError)('Nilai tidak ditemukan', 404);
    // Guru hanya bisa edit nilai yang dia input sendiri
    if (req.user.role === 'guru') {
        const guru = await models_1.Guru.findOne({ where: { user_id: req.user.id } });
        if (!guru || nilai.guru_id !== guru.id) {
            throw (0, errorHandler_1.createError)('Tidak berhak mengubah nilai guru lain', 403);
        }
    }
    const { kuis, tugas, uts, uas, catatan } = req.body;
    let nilaiAkhir = nilai.nilai_akhir;
    let gradeInfo = nilai.grade ? { grade: nilai.grade, predikat: nilai.predikat || '' } : null;
    const k = kuis ?? nilai.kuis ?? 0;
    const t = tugas ?? nilai.tugas ?? 0;
    const u = uts ?? nilai.uts ?? 0;
    const ua = uas ?? nilai.uas ?? 0;
    if (k && t && u && ua) {
        nilaiAkhir = (0, Nilai_1.hitungNilaiAkhir)(k, t, u, ua);
        gradeInfo = (0, Nilai_1.hitungGrade)(nilaiAkhir);
    }
    await nilai.update({
        kuis: k, tugas: t, uts: u, uas: ua,
        nilai_akhir: nilaiAkhir,
        grade: gradeInfo?.grade || null,
        predikat: gradeInfo?.predikat || null,
        catatan,
        update_date: new Date(),
    });
    res.json({ success: true, message: 'Nilai berhasil diperbarui', data: nilai });
};
exports.update = update;
const remove = async (req, res) => {
    const nilai = await models_1.Nilai.findByPk(req.params.id);
    if (!nilai)
        throw (0, errorHandler_1.createError)('Nilai tidak ditemukan', 404);
    await nilai.destroy();
    res.json({ success: true, message: 'Nilai berhasil dihapus' });
};
exports.remove = remove;
const getLaporan = async (req, res) => {
    const { kelas_id, mata_pelajaran_id, semester, tahun_ajaran } = req.query;
    // Filter kelas berdasarkan school_level admin
    const levelWhere = await (0, levelFilter_1.kelasIdFilter)(req.user?.school_level);
    const kelasFilter = kelas_id ? { id: kelas_id } : (levelWhere.kelas_id ? { id: levelWhere.kelas_id } : undefined);
    const include = [
        { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
        {
            model: models_1.Siswa, as: 'siswa',
            required: !!kelasFilter,
            include: [
                { model: models_1.User, as: 'user', attributes: ['nama'] },
                ...(kelasFilter ? [{ model: models_1.Kelas, as: 'kelas', where: kelasFilter }] : [{ model: models_1.Kelas, as: 'kelas' }]),
            ],
        },
    ];
    const where = {};
    if (mata_pelajaran_id)
        where.mata_pelajaran_id = mata_pelajaran_id;
    if (semester)
        where.semester = semester;
    if (tahun_ajaran)
        where.tahun_ajaran = tahun_ajaran;
    // Filter siswa_id jika ada levelWhere langsung
    if (!kelas_id && levelWhere.kelas_id) {
        const siswaList = await models_1.Siswa.findAll({ where: levelWhere, attributes: ['id'] });
        where.siswa_id = { [sequelize_1.Op.in]: siswaList.map((s) => s.id) };
    }
    const nilaiList = await models_1.Nilai.findAll({ where, include, order: [['nilai_akhir', 'DESC']] });
    res.json({ success: true, data: nilaiList });
};
exports.getLaporan = getLaporan;
