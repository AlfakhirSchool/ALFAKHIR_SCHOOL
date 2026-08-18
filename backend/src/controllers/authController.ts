import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import { User, Guru, Siswa, OrangTua, Kelas, Sekolah } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { logAction } from '../middleware/auditLog';
import redis from '../config/redis';

const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'profiles');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan'));
  },
});

const generateTokens = (user: { id: string; nama: string; role: string; school_level?: string | null }) => {
  const accessOpts: SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'] };
  const refreshOpts: SignOptions = { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'] };

  const accessToken = jwt.sign(
    { id: user.id, nama: user.nama, role: user.role, school_level: user.school_level ?? null },
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
  const { email, username: usernameInput, nis, password, role: loginRole, device_id } = req.body;
  const loginIdentifier = usernameInput || email; // support both field names from clients

  if (!password || (!loginIdentifier && !nis)) {
    res.status(400).json({ success: false, message: 'Username/NIS dan password wajib diisi' });
    return;
  }

  let user: InstanceType<typeof User> | null = null;

  if (nis) {
    const siswa = await Siswa.findOne({ where: { nis } });
    if (!siswa) {
      res.status(401).json({ success: false, message: 'NIS atau password salah' });
      return;
    }
    const targetRole = loginRole || 'siswa';
    if (targetRole === 'ortu') {
      const ortu = await OrangTua.findOne({ where: { siswa_id: siswa.id } });
      user = ortu ? await User.unscoped().findOne({ where: { id: (ortu as any).user_id, is_active: true } }) : null;
    } else {
      user = await User.unscoped().findOne({ where: { id: siswa.user_id, is_active: true } });
    }
  } else {
    // cari by username dulu, fallback ke email
    user = await User.unscoped().findOne({ where: { username: loginIdentifier, is_active: true } });
    if (!user) user = await User.unscoped().findOne({ where: { email: loginIdentifier, is_active: true } });
  }

  if (!user || !(user as any).is_active) {
    res.status(401).json({ success: false, message: 'Username/NIS atau password salah' });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validPassword = await bcrypt.compare(password, (user as any).password_hash);
  if (!validPassword) {
    res.status(401).json({ success: false, message: 'NIS atau password salah' });
    return;
  }

  // Device lock — hanya untuk role siswa & ortu (mobile app)
  if (device_id && (user.role === 'siswa' || user.role === 'ortu')) {
    // Cek: device ini sudah terdaftar di akun LAIN
    const deviceOwner = await User.findOne({ where: { device_id } });
    if (deviceOwner && deviceOwner.id !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Perangkat ini sudah terdaftar untuk akun lain. Hubungi admin untuk mereset perangkat.',
        code: 'DEVICE_LOCKED',
      });
      return;
    }
    // Simpan device_id ke akun ini (pertama kali login)
    if (!user.device_id) {
      await user.update({ device_id });
    }
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

  logAction({
    user_id: user.id, nama: user.nama, role: user.role,
    school_level: user.school_level,
    app_source: (req.headers['x-app-source'] as string) ||
      ((req.headers['user-agent'] || '').toLowerCase().includes('dart') ? 'Mobile App' : 'Web'),
    action: 'Login', table: 'users', record_id: user.id,
    ip: req.ip || undefined, user_agent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        school_level: user.school_level ?? null,
        profile_pic: user.profile_pic,
        profile_detail: profileDetail,
      },
    },
  });
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (token) {
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 7 * 24 * 3600;
      if (ttl > 0) {
        redis.setex(`revoked:${token}`, ttl, '1').catch(() => {});
      }
    } catch {
      // ignore malformed token
    }
  }
  res.json({ success: true, message: 'Logout berhasil' });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;
  if (!token) {
    res.status(400).json({ success: false, message: 'Refresh token wajib diisi' });
    return;
  }

  try {
    const revoked = await redis.get(`revoked:${token}`).catch(() => null);
    if (revoked) {
      res.status(401).json({ success: false, message: 'Token sudah tidak valid' });
      return;
    }
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
  const cacheKey = `profile:${req.user!.id}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    res.json({ success: true, data: JSON.parse(cached) });
    return;
  }

  // defaultScope already excludes password_hash and password_default
  const user = await User.findByPk(req.user!.id);
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
    const ortuList = await OrangTua.findAll({
      where: { user_id: user.id },
      include: [{
        model: Siswa,
        as: 'siswa',
        include: [
          { model: Kelas, as: 'kelas', include: [{ model: Sekolah, as: 'sekolah' }] },
          { model: User, as: 'user', attributes: ['nama', 'profile_pic'] },
        ],
      }],
    });
    profileData.ortu = ortuList.map((o) => o.toJSON());
  }

  redis.setex(cacheKey, 60, JSON.stringify(profileData)).catch(() => {});
  res.json({ success: true, data: profileData });
};

export const uploadProfilePhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = (req as any).file;
  if (!file) {
    res.status(400).json({ success: false, message: 'File tidak ditemukan' });
    return;
  }

  const user = await User.findByPk(req.user!.id);
  if (!user) throw createError('User tidak ditemukan', 404);

  // Delete old photo if exists
  if (user.profile_pic) {
    const oldPath = path.join(__dirname, '..', '..', user.profile_pic.replace(/^\//, ''));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const profilePicUrl = `/uploads/profiles/${file.filename}`;
  await user.update({ profile_pic: profilePicUrl });
  redis.del(`profile:${req.user!.id}`).catch(() => {});

  res.json({ success: true, data: { profile_pic: profilePicUrl } });
};

export const resetDevice = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByPk(req.params.userId as string);
  if (!user) throw createError('User tidak ditemukan', 404);
  await user.update({ device_id: null });
  res.json({ success: true, message: 'Perangkat berhasil direset. User dapat login di perangkat baru.' });
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { old_password, new_password } = req.body;
  if (!old_password || !new_password) {
    res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi' });
    return;
  }

  const user = await User.unscoped().findByPk(req.user!.id);
  if (!user) {
    throw createError('User tidak ditemukan', 404);
  }

  const valid = await bcrypt.compare(old_password, user.password_hash);
  if (!valid) {
    res.status(400).json({ success: false, message: 'Password lama tidak benar' });
    return;
  }

  const hashed = await bcrypt.hash(new_password, 10);
  await user.update({ password_hash: hashed });
  redis.del(`profile:${req.user!.id}`).catch(() => {});

  res.json({ success: true, message: 'Password berhasil diubah' });
};

export const switchAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  const current = req.user!;
  if (current.role !== 'admin') {
    throw createError('Unauthorized', 403);
  }

  const target = await User.findByPk(req.params.userId as string);
  if (!target || target.role !== 'admin' || !target.is_active) {
    throw createError('Akun admin tidak ditemukan', 404);
  }

  const targetLevel = target.school_level ?? null;
  const currentLevel = current.school_level ?? null;

  // level admin cannot switch to master admin
  if (currentLevel !== null && targetLevel === null) {
    throw createError('Tidak dapat berpindah ke Admin Master', 403);
  }

  const { accessToken } = generateTokens({
    id: target.id, nama: target.nama, role: target.role, school_level: targetLevel,
  });

  logAction({
    user_id: current.id, nama: current.nama, role: current.role, school_level: currentLevel,
    action: 'switch_account', table: 'users', record_id: target.id,
    new_value: { target_id: target.id, target_nama: target.nama, target_username: target.username },
  });

  res.json({
    success: true,
    data: {
      accessToken,
      user: { id: target.id, username: target.username, nama: target.nama, role: target.role, school_level: targetLevel, profile_pic: target.profile_pic },
    },
  });
};
