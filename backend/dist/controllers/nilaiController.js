"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLaporan = exports.remove = exports.update = exports.getSiswa = exports.create = void 0;
const models_1 = require("../models");
const Nilai_1 = require("../models/Nilai");
const errorHandler_1 = require("../middleware/errorHandler");
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
    const { semester, tahun_ajaran } = req.query;
    const where = { siswa_id: req.params.siswa_id };
    if (semester)
        where.semester = semester;
    if (tahun_ajaran)
        where.tahun_ajaran = tahun_ajaran;
    const nilaiList = await models_1.Nilai.findAll({
        where: { ...where, siswa_id: req.params.siswa_id },
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
    const include = [
        { model: models_1.MataPelajaran, as: 'mata_pelajaran' },
        {
            model: models_1.Siswa, as: 'siswa',
            include: [
                { model: models_1.User, as: 'user', attributes: ['nama'] },
                ...(kelas_id ? [{ model: models_1.Kelas, as: 'kelas', where: { id: kelas_id } }] : []),
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
    const nilaiList = await models_1.Nilai.findAll({ where, include, order: [['nilai_akhir', 'DESC']] });
    res.json({ success: true, data: nilaiList });
};
exports.getLaporan = getLaporan;
