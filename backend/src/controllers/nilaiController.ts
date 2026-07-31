import { Response } from 'express';
import { Op } from 'sequelize';
import { Nilai, Siswa, MataPelajaran, Guru, User, Kelas } from '../models';
import { hitungNilaiAkhir, hitungGrade } from '../models/Nilai';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { kelasIdFilter } from '../utils/levelFilter';

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id, mata_pelajaran_id, semester, tahun_ajaran, kuis, tugas, uts, uas, catatan } = req.body;

  const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
  if (!guru && req.user!.role !== 'admin') throw createError('Data guru tidak ditemukan', 404);

  const existing = await Nilai.findOne({ where: { siswa_id, mata_pelajaran_id, semester, tahun_ajaran } });

  let nilaiAkhir = null;
  let gradeInfo = null;
  if (kuis !== undefined && tugas !== undefined && uts !== undefined && uas !== undefined) {
    nilaiAkhir = hitungNilaiAkhir(kuis, tugas, uts, uas);
    gradeInfo = hitungGrade(nilaiAkhir);
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

  const nilai = await Nilai.create({
    siswa_id,
    mata_pelajaran_id,
    guru_id: guru?.id || req.user!.id,
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

export const getSiswa = async (req: AuthRequest, res: Response): Promise<void> => {
  const { semester, tahun_ajaran } = req.query;
  const where: Record<string, unknown> = { siswa_id: req.params.siswa_id };
  if (semester) where.semester = semester;
  if (tahun_ajaran) where.tahun_ajaran = tahun_ajaran;

  const nilaiList = await Nilai.findAll({
    where,
    include: [
      { model: MataPelajaran, as: 'mata_pelajaran' },
      { model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
    ],
    order: [['mata_pelajaran', 'nama', 'ASC'] as any],
  });

  const rataRata = nilaiList.reduce((sum, n) => sum + (n.nilai_akhir || 0), 0) / (nilaiList.length || 1);

  res.json({ success: true, data: nilaiList, rata_rata: Math.round(rataRata * 100) / 100 });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const nilai = await Nilai.findByPk(req.params.id as string);
  if (!nilai) throw createError('Nilai tidak ditemukan', 404);

  const { kuis, tugas, uts, uas, catatan } = req.body;

  let nilaiAkhir = nilai.nilai_akhir;
  let gradeInfo = nilai.grade ? { grade: nilai.grade, predikat: nilai.predikat || '' } : null;

  const k = kuis ?? nilai.kuis ?? 0;
  const t = tugas ?? nilai.tugas ?? 0;
  const u = uts ?? nilai.uts ?? 0;
  const ua = uas ?? nilai.uas ?? 0;

  if (k && t && u && ua) {
    nilaiAkhir = hitungNilaiAkhir(k, t, u, ua);
    gradeInfo = hitungGrade(nilaiAkhir);
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

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const nilai = await Nilai.findByPk(req.params.id as string);
  if (!nilai) throw createError('Nilai tidak ditemukan', 404);
  await nilai.destroy();
  res.json({ success: true, message: 'Nilai berhasil dihapus' });
};

export const getLaporan = async (req: AuthRequest, res: Response): Promise<void> => {
  const { kelas_id, mata_pelajaran_id, semester, tahun_ajaran } = req.query;

  // Filter kelas berdasarkan school_level admin
  const levelWhere = await kelasIdFilter(req.user?.school_level);
  const kelasFilter = kelas_id ? { id: kelas_id } : (levelWhere.kelas_id ? { id: levelWhere.kelas_id } : undefined);

  const include: any[] = [
    { model: MataPelajaran, as: 'mata_pelajaran' },
    {
      model: Siswa, as: 'siswa',
      required: !!kelasFilter,
      include: [
        { model: User, as: 'user', attributes: ['nama'] },
        ...(kelasFilter ? [{ model: Kelas, as: 'kelas', where: kelasFilter }] : [{ model: Kelas, as: 'kelas' }]),
      ],
    },
  ];

  const where: Record<string, unknown> = {};
  if (mata_pelajaran_id) where.mata_pelajaran_id = mata_pelajaran_id;
  if (semester) where.semester = semester;
  if (tahun_ajaran) where.tahun_ajaran = tahun_ajaran;

  // Filter siswa_id jika ada levelWhere langsung
  if (!kelas_id && levelWhere.kelas_id) {
    const siswaList = await Siswa.findAll({ where: levelWhere, attributes: ['id'] });
    where.siswa_id = { [Op.in]: siswaList.map((s: any) => s.id) };
  }

  const nilaiList = await Nilai.findAll({ where, include, order: [['nilai_akhir', 'DESC']] });
  res.json({ success: true, data: nilaiList });
};
