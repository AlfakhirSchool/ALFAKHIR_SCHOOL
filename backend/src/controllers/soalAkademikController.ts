import { Response } from 'express';
import { SoalAkademik, JawabanAkademik, HasilTesAkademik, Kandidat } from '../models';
import { AuthRequest } from '../middleware/auth';

// publik=true strips jawaban_benar (portal tes kandidat)
const PUBLIK_ATTRS = ['id', 'teks', 'mata_pelajaran', 'gambar_url', 'pilihan', 'urutan'];

export const getAllPublik = async (req: any, res: Response): Promise<void> => {
  const where: any = {};
  if (req.query.level) where.level = req.query.level;
  const soal = await SoalAkademik.findAll({ where, attributes: PUBLIK_ATTRS, order: [['urutan', 'ASC']] });
  res.json({ success: true, data: soal });
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const where: any = {};
  if (req.query.level) where.level = req.query.level;
  const soal = await SoalAkademik.findAll({ where, order: [['urutan', 'ASC']] });
  res.json({ success: true, data: soal });
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  const { teks, mata_pelajaran, pilihan, jawaban_benar, gambar_url, urutan, level } = req.body;
  if (!teks || !mata_pelajaran || !pilihan || !jawaban_benar) {
    res.status(400).json({ success: false, message: 'teks, mata_pelajaran, pilihan, jawaban_benar wajib' }); return;
  }
  const soal = await SoalAkademik.create({
    teks, mata_pelajaran,
    pilihan: typeof pilihan === 'string' ? pilihan : JSON.stringify(pilihan),
    jawaban_benar,
    gambar_url: gambar_url || null,
    urutan: urutan || 0,
    level: level || null,
  });
  res.status(201).json({ success: true, data: soal });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const s = await SoalAkademik.findByPk(req.params.id as string);
  if (!s) { res.status(404).json({ success: false, message: 'Soal tidak ditemukan' }); return; }
  const allowed = ['teks', 'mata_pelajaran', 'pilihan', 'jawaban_benar', 'gambar_url', 'urutan', 'level'];
  const updates: any = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates[key] = key === 'pilihan' && typeof req.body[key] !== 'string'
        ? JSON.stringify(req.body[key]) : req.body[key];
    }
  }
  await s.update(updates);
  res.json({ success: true, data: s });
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const s = await SoalAkademik.findByPk(req.params.id as string);
  if (!s) { res.status(404).json({ success: false, message: 'Soal tidak ditemukan' }); return; }
  await s.destroy();
  res.json({ success: true });
};

// Kandidat submit tes
export const submitTes = async (req: AuthRequest, res: Response): Promise<void> => {
  const kandidat_id = req.params.kandidat_id as string;
  const k = await Kandidat.findByPk(kandidat_id as string);
  if (!k) { res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan' }); return; }

  const existing = await HasilTesAkademik.findOne({ where: { kandidat_id } });
  if (existing) { res.status(409).json({ success: false, message: 'Tes sudah dikerjakan' }); return; }

  const { jawaban } = req.body; // { soal_id: jawaban_kandidat }
  const soalList = await SoalAkademik.findAll({ where: { level: k.level } });

  const jawabanRows: any[] = [];
  const skorPerMapel: Record<string, { total: number; correct: number }> = {};
  let totalBenar = 0;

  for (const soal of soalList) {
    const jwb = jawaban[soal.id] || '';
    const benar = jwb === soal.jawaban_benar;
    if (benar) totalBenar++;

    jawabanRows.push({ kandidat_id, soal_id: soal.id, jawaban: jwb, benar });

    if (!skorPerMapel[soal.mata_pelajaran]) skorPerMapel[soal.mata_pelajaran] = { total: 0, correct: 0 };
    skorPerMapel[soal.mata_pelajaran].total++;
    if (benar) skorPerMapel[soal.mata_pelajaran].correct++;
  }

  const totalSkor = soalList.length > 0 ? (totalBenar / soalList.length) * 100 : 0;

  await JawabanAkademik.bulkCreate(jawabanRows, { ignoreDuplicates: true });
  let hasil;
  try {
    hasil = await HasilTesAkademik.create({
      kandidat_id,
      total_skor: Math.round(totalSkor * 10) / 10,
      skor_per_mapel: JSON.stringify(skorPerMapel),
    });
  } catch (e: any) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      res.status(409).json({ success: false, message: 'Tes sudah dikerjakan' });
      return;
    }
    throw e;
  }
  await k.update({ skor_akademik: hasil.total_skor });

  res.json({ success: true, data: hasil });
};

export const getHasil = async (req: AuthRequest, res: Response): Promise<void> => {
  const hasil = await HasilTesAkademik.findOne({ where: { kandidat_id: req.params.kandidat_id as string } });
  res.json({ success: true, data: hasil });
};
