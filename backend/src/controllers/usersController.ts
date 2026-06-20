import { Response } from 'express';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { User, Guru, Siswa, OrangTua, Kelas, Sekolah } from '../models';
import { AuthRequest } from '../middleware/auth';

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, school_level, search, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where: any = {};
  if (role) where.role = role;
  if (school_level === 'null') where.school_level = null;
  else if (school_level) where.school_level = school_level;
  if (search) {
    where[Op.or] = [
      { nama: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password_hash'] },
    order: [['created_at', 'DESC']],
    limit: Number(limit),
    offset,
  });

  res.json({
    success: true,
    data: rows,
    pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) },
  });
};

export const getUserDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password_hash'] } });
  if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return; }

  const detail: any = user.toJSON();
  if (user.role === 'guru') detail.guru = await Guru.findOne({ where: { user_id: user.id } });
  if (user.role === 'siswa') detail.siswa = await Siswa.findOne({
    where: { user_id: user.id },
    include: [{ model: Kelas, as: 'kelas', include: [{ model: Sekolah, as: 'sekolah' }] }],
  });
  if (user.role === 'ortu') detail.ortu = await OrangTua.findAll({ where: { user_id: user.id } });

  res.json({ success: true, data: detail });
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password, nama, role, school_level } = req.body;
  if (!email || !password || !nama || !role) {
    res.status(400).json({ success: false, message: 'email, password, nama, role wajib diisi' });
    return;
  }

  const exists = await User.findOne({ where: { email } });
  if (exists) { res.status(400).json({ success: false, message: 'Email sudah terdaftar' }); return; }

  const password_hash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email, password_hash, nama, role,
    school_level: school_level || null,
    is_active: true,
  });

  res.status(201).json({
    success: true,
    message: 'Akun berhasil dibuat',
    data: { id: user.id, email: user.email, nama: user.nama, role: user.role, school_level: user.school_level },
  });
};

export const resetPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });
    return;
  }

  const user = await User.findByPk(req.params.id);
  if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return; }

  const password_hash = await bcrypt.hash(password, 12);
  await user.update({ password_hash });

  res.json({ success: true, message: `Password ${user.nama} berhasil direset` });
};

export const toggleActive = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByPk(req.params.id);
  if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return; }

  // Jangan nonaktifkan diri sendiri
  if (user.id === req.user!.id) {
    res.status(400).json({ success: false, message: 'Tidak bisa menonaktifkan akun sendiri' });
    return;
  }

  await user.update({ is_active: !user.is_active });
  res.json({ success: true, message: `Akun ${user.nama} ${user.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, data: { is_active: user.is_active } });
};
