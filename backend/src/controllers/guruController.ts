import { Response } from 'express';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { User, Guru } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const userWhere: Record<string, unknown> = {};
  if (search) userWhere.nama = { [Op.iLike]: `%${search}%` };

  const { count, rows } = await Guru.findAndCountAll({
    include: [{ model: User, as: 'user', where: userWhere, attributes: { exclude: ['password_hash'] } }],
    limit: parseInt(limit as string),
    offset,
  });

  res.json({
    success: true,
    data: rows,
    pagination: { total: count, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(count / parseInt(limit as string)) },
  });
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  const guru = await Guru.findByPk(req.params.id as string, {
    include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash'] } }],
  });
  if (!guru) throw createError('Guru tidak ditemukan', 404);
  res.json({ success: true, data: guru });
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password, nama, nip, spesialisasi, no_telp } = req.body;

  const existing = await User.findOne({ where: { email } });
  if (existing) {
    res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    return;
  }

  const password_hash = await bcrypt.hash(password || '12345678', 12);
  const user = await User.create({ email, password_hash, nama, role: 'guru' });
  const guru = await Guru.create({ user_id: user.id, nip, spesialisasi, no_telp });

  res.status(201).json({ success: true, message: 'Guru berhasil dibuat', data: { user, guru } });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const guru = await Guru.findByPk(req.params.id as string, { include: [{ model: User, as: 'user' }] });
  if (!guru) throw createError('Guru tidak ditemukan', 404);

  const { nama, email, nip, spesialisasi, no_telp, is_active } = req.body;
  await (guru as any).user.update({ nama, email, is_active });
  await guru.update({ nip, spesialisasi, no_telp });

  res.json({ success: true, message: 'Data guru berhasil diperbarui' });
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const guru = await Guru.findByPk(req.params.id as string, { include: [{ model: User, as: 'user' }] });
  if (!guru) throw createError('Guru tidak ditemukan', 404);

  await (guru as any).user.update({ is_active: false });
  res.json({ success: true, message: 'Guru berhasil dinonaktifkan' });
};
