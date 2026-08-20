import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import Materi from '../models/Materi';
import Guru from '../models/Guru';
import { User } from '../models';
import { AuthRequest } from '../middleware/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'materi');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const getMateri = async (req: AuthRequest, res: Response): Promise<void> => {
  const where: any = { is_active: true };
  if (req.query.mata_pelajaran_id) where.mata_pelajaran_id = req.query.mata_pelajaran_id;
  if (req.query.kelas_id) where.kelas_id = req.query.kelas_id;
  const data = await Materi.findAll({
    where,
    include: [{ model: Guru, as: 'guru', attributes: ['id'], include: [{ model: User, as: 'user', attributes: ['nama'] }] }],
    order: [['created_at', 'DESC']], limit: 100,
  });
  res.json({ success: true, data });
};

export const uploadMateri = async (req: AuthRequest, res: Response): Promise<void> => {
  const { judul, deskripsi, mata_pelajaran_id, kelas_id, link_video } = req.body;
  if (!judul || !mata_pelajaran_id) { res.status(400).json({ success: false, message: 'Judul dan mata pelajaran wajib diisi' }); return; }

  const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
  if (!guru) { res.status(403).json({ success: false, message: 'Akun guru tidak ditemukan' }); return; }

  const materi = await Materi.create({
    judul, deskripsi: deskripsi || null, mata_pelajaran_id, kelas_id: kelas_id || null,
    guru_id: guru.id,
    file_url: req.file ? `/uploads/materi/${req.file.filename}` : null,
    file_name: req.file?.originalname || null,
    file_size: req.file?.size || null,
    link_video: link_video || null,
  });
  res.status(201).json({ success: true, data: materi });
};

export const deleteMateri = async (req: AuthRequest, res: Response): Promise<void> => {
  const materi = await Materi.findByPk(req.params.id as string);
  if (!materi) { res.status(404).json({ success: false, message: 'Materi tidak ditemukan' }); return; }
  if (materi.file_url) {
    const filePath = path.join(process.cwd(), materi.file_url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await materi.update({ is_active: false });
  res.json({ success: true, message: 'Materi dihapus' });
};
