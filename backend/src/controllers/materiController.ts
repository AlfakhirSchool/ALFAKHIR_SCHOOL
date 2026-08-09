import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import Materi from '../models/Materi';
import Guru from '../models/Guru';
import MataKelas from '../models/MataKelas';
import { AuthRequest } from '../middleware/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'materi');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const getMateri = async (req: AuthRequest, res: Response): Promise<void> => {
  const { mata_pelajaran_id, kelas_id } = req.query;
  const where: any = { is_active: true };
  if (mata_pelajaran_id) where.mata_pelajaran_id = mata_pelajaran_id;
  if (kelas_id) where.kelas_id = kelas_id;

  const data = await Materi.findAll({
    where,
    include: [
      { model: Guru, as: 'guru', attributes: ['id', 'nama'] },
    ],
    order: [['created_at', 'DESC']],
  });
  res.json({ success: true, data });
};

export const uploadMateri = async (req: AuthRequest, res: Response): Promise<void> => {
  const { judul, deskripsi, mata_pelajaran_id, kelas_id } = req.body;
  if (!judul || !mata_pelajaran_id) {
    res.status(400).json({ success: false, message: 'Judul dan mata pelajaran wajib diisi' });
    return;
  }

  const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
  if (!guru) { res.status(403).json({ success: false, message: 'Akun guru tidak ditemukan' }); return; }

  let file_url = null, file_name = null, file_size = null;
  if (req.file) {
    file_url = `/uploads/materi/${req.file.filename}`;
    file_name = req.file.originalname;
    file_size = req.file.size;
  }

  const materi = await Materi.create({
    judul,
    deskripsi: deskripsi || null,
    mata_pelajaran_id,
    kelas_id: kelas_id || null,
    guru_id: guru.id,
    file_url,
    file_name,
    file_size,
  });

  res.status(201).json({ success: true, data: materi });
};

export const deleteMateri = async (req: AuthRequest, res: Response): Promise<void> => {
  const materi = await Materi.findByPk(req.params.id);
  if (!materi) { res.status(404).json({ success: false, message: 'Materi tidak ditemukan' }); return; }

  if (materi.file_url) {
    const filePath = path.join(process.cwd(), materi.file_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  await materi.update({ is_active: false });
  res.json({ success: true, message: 'Materi dihapus' });
};
