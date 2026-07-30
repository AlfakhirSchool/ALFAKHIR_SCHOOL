import { Response } from 'express';
import { CatatanPewawancara, Kandidat } from '../models';
import { AuthRequest } from '../middleware/auth';

export const getByKandidat = async (req: AuthRequest, res: Response): Promise<void> => {
  const catatan = await CatatanPewawancara.findAll({
    where: { kandidat_id: req.params.kandidat_id as string },
    order: [['created_at', 'ASC']],
  });
  res.json({ success: true, data: catatan });
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  const kandidat_id = req.params.kandidat_id as string;
  const k = await Kandidat.findByPk(kandidat_id);
  if (!k) { res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan' }); return; }

  const { pewawancara_email, pewawancara_nama, observasi, penilaian_akademik, dukungan_keluarga, catatan_karakter, catatan_lain, rekomendasi } = req.body;
  const catatan = await CatatanPewawancara.create({
    kandidat_id,
    pewawancara_email: pewawancara_email || null,
    pewawancara_nama: pewawancara_nama || null,
    observasi: observasi || null,
    penilaian_akademik: penilaian_akademik || null,
    dukungan_keluarga: dukungan_keluarga || null,
    catatan_karakter: catatan_karakter || null,
    catatan_lain: catatan_lain || null,
    rekomendasi: rekomendasi || null,
  });
  res.status(201).json({ success: true, data: catatan });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const c = await CatatanPewawancara.findByPk(req.params.id as string);
  if (!c) { res.status(404).json({ success: false, message: 'Catatan tidak ditemukan' }); return; }
  if (c.is_locked && (req.user as any)?.role !== 'admin') {
    res.status(403).json({ success: false, message: 'Catatan sudah dikunci' }); return;
  }
  const allowed = ['pewawancara_email', 'pewawancara_nama', 'observasi', 'penilaian_akademik',
    'dukungan_keluarga', 'catatan_karakter', 'catatan_lain', 'rekomendasi', 'is_locked'];
  const updates: any = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  await c.update(updates);
  res.json({ success: true, data: c });
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const c = await CatatanPewawancara.findByPk(req.params.id as string);
  if (!c) { res.status(404).json({ success: false, message: 'Catatan tidak ditemukan' }); return; }
  await c.destroy();
  res.json({ success: true });
};
