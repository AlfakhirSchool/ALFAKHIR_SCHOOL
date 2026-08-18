import { Response } from 'express';
import Pengumuman from '../models/Pengumuman';
import { AuthRequest } from '../middleware/auth';

export const getPengumuman = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { school_level, limit } = req.query;
    const where: any = { is_active: true };
    if (school_level) where.school_level = school_level as string;

    const data = await Pengumuman.findAll({
      where,
      order: [['tanggal_publish', 'DESC']],
      limit: limit ? parseInt(limit as string) : 50,
    });
    res.json({ success: true, data });
  } catch (e: any) {
    console.error('GET /pengumuman error:', e.message);
    res.status(500).json({ success: false, message: 'Gagal memuat pengumuman' });
  }
};

export const getPengumumanById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const p = await Pengumuman.findByPk(req.params.id as string);
    if (!p) { res.status(404).json({ success: false, message: 'Tidak ditemukan' }); return; }
    res.json({ success: true, data: p });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat pengumuman' });
  }
};

export const createPengumuman = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { judul, isi, kategori, target_role, school_level, tanggal_publish } = req.body;
    if (!judul || !isi) { res.status(400).json({ success: false, message: 'Judul dan isi wajib diisi' }); return; }

    const p = await Pengumuman.create({
      judul, isi,
      kategori: kategori || 'Pengumuman',
      target_role: target_role || 'all',
      school_level: school_level || 'all',
      tanggal_publish: tanggal_publish ? new Date(tanggal_publish) : new Date(),
      created_by: req.user?.id || null,
    });
    res.status(201).json({ success: true, data: p });
  } catch (e: any) {
    console.error('POST /pengumuman error:', e.message);
    res.status(500).json({ success: false, message: 'Gagal membuat pengumuman' });
  }
};

export const updatePengumuman = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const p = await Pengumuman.findByPk(req.params.id as string);
    if (!p) { res.status(404).json({ success: false, message: 'Tidak ditemukan' }); return; }
    const { judul, isi, kategori, target_role, school_level, tanggal_publish, is_active } = req.body;
    await p.update({ judul, isi, kategori, target_role, school_level, tanggal_publish, is_active });
    res.json({ success: true, data: p });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Gagal mengupdate pengumuman' });
  }
};

export const deletePengumuman = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const p = await Pengumuman.findByPk(req.params.id as string);
    if (!p) { res.status(404).json({ success: false, message: 'Tidak ditemukan' }); return; }
    await p.update({ is_active: false });
    res.json({ success: true, message: 'Pengumuman dihapus' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Gagal menghapus pengumuman' });
  }
};
