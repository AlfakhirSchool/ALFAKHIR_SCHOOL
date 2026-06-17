import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User, Guru, Siswa, OrangTua, Kelas, Sekolah } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const generateTokens = (user: { id: string; email: string; nama: string; role: string }) => {
  const accessOpts: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as SignOptions['expiresIn'] };
  const refreshOpts: SignOptions = { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'] };

  const accessToken = jwt.sign(
    { id: user.id, email: user.email, nama: user.nama, role: user.role },
    process.env.JWT_SECRET as string,
    accessOpts
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET as string,
    refreshOpts
  );
  return { accessToken, refreshToken };
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
    return;
  }

  const user = await User.findOne({ where: { email, is_active: true } });
  if (!user) {
    res.status(401).json({ success: false, message: 'Email atau password salah' });
    return;
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    res.status(401).json({ success: false, message: 'Email atau password salah' });
    return;
  }

  const { accessToken, refreshToken } = generateTokens(user);

  let profileDetail = null;
  if (user.role === 'guru') {
    profileDetail = await Guru.findOne({ where: { user_id: user.id } });
  } else if (user.role === 'siswa') {
    profileDetail = await Siswa.findOne({ where: { user_id: user.id } });
  } else if (user.role === 'ortu') {
    profileDetail = await OrangTua.findOne({ where: { user_id: user.id } });
  }

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nama: user.nama,
        role: user.role,
        profile_pic: user.profile_pic,
        profile_detail: profileDetail,
      },
    },
  });
};

export const logout = async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Logout berhasil' });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (!token) {
    res.status(400).json({ success: false, message: 'Refresh token wajib diisi' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { id: string };
    const user = await User.findOne({ where: { id: decoded.id, is_active: true } });
    if (!user) {
      res.status(401).json({ success: false, message: 'User tidak ditemukan' });
      return;
    }

    const tokens = generateTokens(user);
    res.json({ success: true, data: tokens });
  } catch {
    res.status(401).json({ success: false, message: 'Refresh token tidak valid' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByPk(req.user!.id, {
    attributes: { exclude: ['password_hash'] },
  });
  if (!user) {
    throw createError('User tidak ditemukan', 404);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileData: any = { ...user.toJSON() };

  if (user.role === 'siswa') {
    const siswa = await Siswa.findOne({
      where: { user_id: user.id },
      include: [{ model: Kelas, as: 'kelas', include: [{ model: Sekolah, as: 'sekolah' }] }],
    });
    if (siswa) profileData.siswa = siswa.toJSON();
  } else if (user.role === 'guru') {
    const guru = await Guru.findOne({ where: { user_id: user.id } });
    if (guru) profileData.guru = guru.toJSON();
  } else if (user.role === 'ortu') {
    const ortu = await OrangTua.findOne({ where: { user_id: user.id } });
    if (ortu) profileData.ortu = ortu.toJSON();
  }

  res.json({ success: true, data: profileData });
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi' });
    return;
  }

  const user = await User.findByPk(req.user!.id);
  if (!user) {
    throw createError('User tidak ditemukan', 404);
  }

  const valid = await bcrypt.compare(old_password, user.password_hash);
  if (!valid) {
    res.status(400).json({ success: false, message: 'Password lama tidak benar' });
    return;
  }

  const hashed = await bcrypt.hash(new_password, 12);
  await user.update({ password_hash: hashed });

  res.json({ success: true, message: 'Password berhasil diubah' });
};
