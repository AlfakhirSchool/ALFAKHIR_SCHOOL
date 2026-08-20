import { Response } from 'express';
import bcrypt from 'bcrypt';
import { Op, literal } from 'sequelize';
import { User, Guru } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const levelWhere = (school_level: string | null | undefined) => {
  if (!school_level) return {};
  return { [Op.or]: [literal(`'${school_level}' = ANY(school_levels)`), literal(`school_levels IS NULL`), literal(`school_levels = '{}'`)] };
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, jenjang, page = '1', limit = '20' } = req.query;
  const p = parseInt(page as string);
  const lim = parseInt(limit as string);

  const userWhere: Record<string, unknown> = {};
  if (search) userWhere.nama = { [Op.iLike]: `%${search}%` };

  const guruWhere: Record<string, unknown> = {};
  if (req.user?.school_level) Object.assign(guruWhere, levelWhere(req.user.school_level));
  if (jenjang) Object.assign(guruWhere, { [Op.or]: [literal(`'${jenjang}' = ANY(school_levels)`)] });

  const hasWhere = Object.keys(guruWhere).length > 0 || Object.getOwnPropertySymbols(guruWhere).length > 0;
  const { count, rows } = await Guru.findAndCountAll({
    where: hasWhere ? guruWhere : undefined,
    include: [{ model: User, as: 'user', where: userWhere, attributes: { exclude: ['password_hash', 'password_default'] } }],
    limit: lim, offset: (p - 1) * lim,
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: lim, totalPages: Math.ceil(count / lim) } });
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  const guru = await Guru.findByPk(req.params.id as string, {
    include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash', 'password_default'] } }],
  });
  if (!guru) throw createError('Guru tidak ditemukan', 404);
  res.json({ success: true, data: guru });
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  const { password, nama, nip, spesialisasi, no_telp, school_levels } = req.body;

  let autoUsername = (req.body.username || nama || '').trim().toLowerCase().replace(/\s+/g, '.');
  let suffix = 2;
  while (await User.findOne({ where: { username: autoUsername } })) {
    autoUsername = `${(req.body.username || nama || '').trim().toLowerCase().replace(/\s+/g, '.')}.${suffix++}`;
  }

  const autoPassword = password || '12345678';
  const user = await User.create({ username: autoUsername, password_hash: await bcrypt.hash(autoPassword, 10), nama, role: 'guru' });
  const guru = await Guru.create({ user_id: user.id, nip: nip || null, spesialisasi: spesialisasi || null, no_telp: no_telp || null, school_levels: Array.isArray(school_levels) ? school_levels : [] });

  const webhookUrl = process.env.N8N_WEBHOOK_GURU;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, login: autoUsername, password_default: autoPassword, nip: nip || '', spesialisasi: spesialisasi || '', jenjang: Array.isArray(school_levels) ? school_levels.join(', ') : '', tanggal_dibuat: new Date().toISOString() }),
    }).catch(() => {});
  }

  res.status(201).json({ success: true, message: 'Guru berhasil dibuat', data: { user, guru } });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const guru = await Guru.findByPk(req.params.id as string, { include: [{ model: User, as: 'user' }] });
  if (!guru) throw createError('Guru tidak ditemukan', 404);
  const { nama, nip, spesialisasi, no_telp, is_active, school_levels } = req.body;
  await (guru as any).user.update({ nama, is_active });
  await guru.update({ nip: nip || null, spesialisasi: spesialisasi || null, no_telp: no_telp || null, school_levels: Array.isArray(school_levels) ? school_levels : guru.school_levels });
  res.json({ success: true, message: 'Data guru berhasil diperbarui' });
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const guru = await Guru.findByPk(req.params.id as string, { include: [{ model: User, as: 'user' }] });
  if (!guru) throw createError('Guru tidak ditemukan', 404);
  await (guru as any).user.update({ is_active: false });
  res.json({ success: true, message: 'Guru berhasil dinonaktifkan' });
};
