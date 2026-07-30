import { Response, Request } from 'express';
import { Op } from 'sequelize';
import { PertanyaanForm } from '../models';
import { AuthRequest } from '../middleware/auth';

export const getAll = async (req: Request, res: Response): Promise<void> => {
  const where: any = {};
  if (req.query.role) where.role = req.query.role;
  if (req.query.level) where.level = { [Op.or]: [req.query.level as string, null] };
  const data = await PertanyaanForm.findAll({ where, order: [['urutan', 'ASC'], ['created_at', 'ASC']] });
  res.json({ success: true, data });
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  const { teks, tipe, role, level, urutan, options } = req.body;
  if (!teks || !role) { res.status(400).json({ success: false, message: 'teks dan role wajib' }); return; }
  const p = await PertanyaanForm.create({ teks, tipe: tipe || 'text', role, level: level || null, urutan: urutan || 0, options: options || null });
  res.status(201).json({ success: true, data: p });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const p = await PertanyaanForm.findByPk(req.params.id as string);
  if (!p) { res.status(404).json({ success: false, message: 'Pertanyaan tidak ditemukan' }); return; }
  const allowed = ['teks', 'tipe', 'role', 'level', 'urutan', 'options'];
  const updates: any = {};
  for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
  await p.update(updates);
  res.json({ success: true, data: p });
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const p = await PertanyaanForm.findByPk(req.params.id as string);
  if (!p) { res.status(404).json({ success: false, message: 'Pertanyaan tidak ditemukan' }); return; }
  if (p.is_system) { res.status(403).json({ success: false, message: 'Pertanyaan sistem tidak dapat dihapus' }); return; }
  await p.destroy();
  res.json({ success: true });
};
