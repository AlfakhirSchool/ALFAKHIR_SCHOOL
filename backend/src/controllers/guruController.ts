import { Response } from 'express';
import bcrypt from 'bcrypt';
import { Op, literal } from 'sequelize';
import { User, Guru } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const levelWhere = (school_level: string | null | undefined) => {
  if (!school_level) return {};
  return {
    [Op.or]: [
      literal(`'${school_level}' = ANY(school_levels)`),
      literal(`school_levels IS NULL`),
      literal(`school_levels = '{}'`),
    ],
  };
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, jenjang, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const userWhere: Record<string, unknown> = {};
  if (search) userWhere.nama = { [Op.iLike]: `%${search}%` };

  // Build guru where clause
  const guruWhere: Record<string, unknown> = {};

  // If admin has school_level, filter gurus assigned to that level
  if (req.user?.school_level) {
    Object.assign(guruWhere, levelWhere(req.user.school_level));
  }

  // Additional jenjang filter from query param (for master admin)
  if (jenjang) {
    Object.assign(guruWhere, { [Op.or]: [literal(`'${jenjang}' = ANY(school_levels)`)] });
  }

  const { count, rows } = await Guru.findAndCountAll({
    where: Object.keys(guruWhere).length > 0 ? guruWhere : undefined,
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
  const { password, nama, nip, spesialisasi, no_telp, school_levels } = req.body;

  // Generate unique email from nama (used as identifier, not real email)
  let autoEmail = nama;
  let suffix = 2;
  while (await User.findOne({ where: { email: autoEmail } })) {
    autoEmail = `${nama} ${suffix++}`;
  }

  const autoPassword = password || '12345678';
  const password_hash = await bcrypt.hash(autoPassword, 10);
  const user = await User.create({ email: autoEmail, password_hash, nama, role: 'guru' });
  const guru = await Guru.create({
    user_id: user.id,
    nip: nip || null,
    spesialisasi: spesialisasi || null,
    no_telp: no_telp || null,
    school_levels: Array.isArray(school_levels) ? school_levels : [],
  });

  // Kirim ke n8n async
  const webhookUrl = process.env.N8N_WEBHOOK_GURU;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama,
        email: req.body.email || null,
        login: req.body.email || nama,
        password_default: autoPassword,
        nip: nip || '',
        spesialisasi: spesialisasi || '',
        jenjang: Array.isArray(school_levels) ? school_levels.join(', ') : '',
        tanggal_dibuat: new Date().toISOString(),
      }),
    }).catch(() => {});
  }

  res.status(201).json({ success: true, message: 'Guru berhasil dibuat', data: { user, guru } });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const guru = await Guru.findByPk(req.params.id as string, { include: [{ model: User, as: 'user' }] });
  if (!guru) throw createError('Guru tidak ditemukan', 404);

  const { nama, nip, spesialisasi, no_telp, is_active, school_levels } = req.body;
  // email field = nama (identifier), update when nama changes
  await (guru as any).user.update({ nama, email: nama, is_active });
  await guru.update({
    nip: nip || null,
    spesialisasi: spesialisasi || null,
    no_telp: no_telp || null,
    school_levels: Array.isArray(school_levels) ? school_levels : guru.school_levels,
  });

  res.json({ success: true, message: 'Data guru berhasil diperbarui' });
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const guru = await Guru.findByPk(req.params.id as string, { include: [{ model: User, as: 'user' }] });
  if (!guru) throw createError('Guru tidak ditemukan', 404);

  await (guru as any).user.update({ is_active: false });
  res.json({ success: true, message: 'Guru berhasil dinonaktifkan' });
};
