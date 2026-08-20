import { Response } from 'express';
import bcrypt from 'bcrypt';
import { Op, QueryTypes } from 'sequelize';
import { User, Guru, Siswa, OrangTua, Kelas, Sekolah } from '../models';
import { AuthRequest } from '../middleware/auth';
import sequelize from '../config/database';

const VALID_JENJANG = ['SD', 'SMP', 'SMA'];

const assertInScope = async (adminJenjang: string | null, targetUserId: string, target?: InstanceType<typeof User>): Promise<string | null> => {
  if (!adminJenjang) return null;
  if (!VALID_JENJANG.includes(adminJenjang)) return 'Jenjang admin tidak valid';

  const user = target ?? await User.findByPk(targetUserId);
  if (!user) return 'User tidak ditemukan';

  if (user.role === 'admin') return user.school_level === adminJenjang ? null : `Hanya dapat mengelola Admin ${adminJenjang}`;

  if (user.role === 'guru') {
    const guru = await Guru.findOne({ where: { user_id: targetUserId } });
    if (!guru || !guru.school_levels?.length) return null;
    return guru.school_levels.includes(adminJenjang) ? null : `Guru ini tidak mengajar di ${adminJenjang}`;
  }

  if (user.role === 'siswa') {
    const [row] = await sequelize.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM siswa s JOIN kelas k ON s.kelas_id = k.id JOIN sekolah sch ON k.sekolah_id = sch.id WHERE s.user_id = :uid AND sch.level = :jenjang`,
      { replacements: { uid: targetUserId, jenjang: adminJenjang }, type: QueryTypes.SELECT }
    );
    return row?.cnt !== '0' ? null : `Siswa ini bukan lingkup ${adminJenjang}`;
  }

  if (user.role === 'ortu') {
    const [row] = await sequelize.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM orang_tua ot JOIN siswa s ON ot.siswa_id = s.id JOIN kelas k ON s.kelas_id = k.id JOIN sekolah sch ON k.sekolah_id = sch.id WHERE ot.user_id = :uid AND sch.level = :jenjang`,
      { replacements: { uid: targetUserId, jenjang: adminJenjang }, type: QueryTypes.SELECT }
    );
    return row?.cnt !== '0' ? null : `Orang tua ini bukan lingkup ${adminJenjang}`;
  }

  return null;
};

// Cari user + cek scope — return null jika sudah kirim error response
const findUserScoped = async (req: AuthRequest, res: Response, id: string): Promise<InstanceType<typeof User> | null> => {
  const user = await User.findByPk(id);
  if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return null; }
  const err = await assertInScope(req.user?.school_level ?? null, id, user);
  if (err) { res.status(403).json({ success: false, message: err }); return null; }
  return user;
};

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, search, page = 1, limit = 50, jenjang: jenjangParam } = req.query;
  const limitCapped = Math.min(Number(limit), 200);
  const offset = (Number(page) - 1) * limitCapped;
  const adminJenjang = req.user?.school_level ?? null;
  const effectiveJenjang = adminJenjang ?? (jenjangParam && VALID_JENJANG.includes(jenjangParam as string) ? (jenjangParam as string) : null);

  const where: any = {};
  if (role) where.role = role;
  if (search) where[Op.or] = [{ nama: { [Op.iLike]: `%${search}%` } }, { username: { [Op.iLike]: `%${search}%` } }];

  if (effectiveJenjang && VALID_JENJANG.includes(effectiveJenjang)) {
    const j = effectiveJenjang;
    const guruSub = `EXISTS (SELECT 1 FROM guru g WHERE g.user_id = "User"."id" AND '${j}' = ANY(g.school_levels))`;
    const siswaSub = `EXISTS (SELECT 1 FROM siswa s JOIN kelas k ON s.kelas_id = k.id JOIN sekolah sch ON k.sekolah_id = sch.id WHERE s.user_id = "User"."id" AND sch.level = '${j}')`;
    const ortuSub = `EXISTS (SELECT 1 FROM orang_tua ot JOIN siswa s ON ot.siswa_id = s.id JOIN kelas k ON s.kelas_id = k.id JOIN sekolah sch ON k.sekolah_id = sch.id WHERE ot.user_id = "User"."id" AND sch.level = '${j}')`;

    if (role === 'admin') where.school_level = j;
    else if (role === 'guru') where[Op.and] = [sequelize.literal(guruSub)];
    else if (role === 'siswa') where[Op.and] = [sequelize.literal(siswaSub)];
    else if (role === 'ortu') where[Op.and] = [sequelize.literal(ortuSub)];
    else where[Op.and] = [sequelize.literal(
      `("User"."role" = 'admin' AND "User"."school_level" = '${j}') OR ("User"."role" = 'guru' AND ${guruSub}) OR ("User"."role" = 'siswa' AND ${siswaSub}) OR ("User"."role" = 'ortu' AND ${ortuSub})`
    )];
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password_hash', 'password_default'] },
    include: [
      { model: Guru, as: 'guru_detail', attributes: ['id', 'school_levels'], required: false },
      { model: Siswa, as: 'siswa_detail', required: false, include: [{ model: Kelas, as: 'kelas', include: [{ model: Sekolah, as: 'sekolah', attributes: ['level', 'nama'] }] }] },
    ],
    order: [['created_at', 'DESC']],
    limit: limitCapped, offset,
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: Number(page), limit: limitCapped, totalPages: Math.ceil(count / limitCapped) } });
};

export const getUserDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByPk(req.params.id as string, { attributes: { exclude: ['password_hash'] } });
  if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return; }
  const err = await assertInScope(req.user?.school_level ?? null, req.params.id as string, user);
  if (err) { res.status(403).json({ success: false, message: err }); return; }

  const detail: any = user.toJSON();
  if (user.role === 'guru') detail.guru = await Guru.findOne({ where: { user_id: user.id } });
  if (user.role === 'siswa') detail.siswa = await Siswa.findOne({ where: { user_id: user.id }, include: [{ model: Kelas, as: 'kelas', include: [{ model: Sekolah, as: 'sekolah' }] }] });
  if (user.role === 'ortu') detail.ortu = await OrangTua.findAll({ where: { user_id: user.id } });
  res.json({ success: true, data: detail });
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const { username: usernameInput, password, nama, role, school_level } = req.body;
  const loginId = (usernameInput || '').trim().toLowerCase();
  const adminJenjang = req.user?.school_level ?? null;

  if (!loginId || !password || !nama || !role) {
    res.status(400).json({ success: false, message: 'username, password, nama, role wajib diisi' }); return;
  }
  if (adminJenjang && role === 'admin' && (!school_level || school_level !== adminJenjang)) {
    res.status(403).json({ success: false, message: `Admin ${adminJenjang} hanya dapat membuat akun Admin ${adminJenjang}` }); return;
  }

  const exists = await User.findOne({ where: { username: loginId } });
  if (exists) { res.status(400).json({ success: false, message: 'Username sudah terdaftar' }); return; }

  const user = await User.create({
    username: loginId,
    password_hash: await bcrypt.hash(password, 10),
    nama, role,
    school_level: role === 'admin' ? (school_level || null) : null,
    is_active: true,
    password_default: password,
  } as any);

  if (role === 'guru') {
    await Guru.create({ user_id: user.id, school_levels: [] });
    const webhookUrl = process.env.N8N_WEBHOOK_GURU;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama, login: loginId, password_default: password, pelajaran: '', jenjang: school_level || '', tanggal_dibuat: new Date().toISOString() }),
      }).catch(() => {});
    }
  }

  res.status(201).json({ success: true, message: 'Akun berhasil dibuat', data: { id: user.id, username: user.username, nama: user.nama, role: user.role, school_level: user.school_level } });
};

export const resetPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { password } = req.body;
  if (!password || password.length < 6) { res.status(400).json({ success: false, message: 'Password minimal 6 karakter' }); return; }
  const user = await findUserScoped(req, res, req.params.id as string);
  if (!user) return;
  await (user as any).update({ password_hash: await bcrypt.hash(password, 10), password_default: password });
  res.json({ success: true, message: `Password ${user.nama} berhasil direset` });
};

export const setGuruJenjang = async (req: AuthRequest, res: Response): Promise<void> => {
  const { school_levels } = req.body;
  if (!Array.isArray(school_levels)) { res.status(400).json({ success: false, message: 'school_levels harus berupa array' }); return; }

  const user = await User.findByPk(req.params.id as string);
  if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return; }
  if (user.role !== 'guru') { res.status(400).json({ success: false, message: 'Hanya berlaku untuk role guru' }); return; }

  const adminJenjang = req.user?.school_level ?? null;
  if (adminJenjang) {
    const hasOtherJenjang = school_levels.filter((l: string) => VALID_JENJANG.includes(l)).some((l: string) => l !== adminJenjang);
    if (hasOtherJenjang) { res.status(403).json({ success: false, message: `Admin ${adminJenjang} hanya dapat mengatur jenjang ${adminJenjang}` }); return; }
  }

  let guru = await Guru.findOne({ where: { user_id: user.id } });
  if (!guru) guru = await Guru.create({ user_id: user.id, school_levels: [] });

  let validLevels = school_levels.filter((l: string) => VALID_JENJANG.includes(l));
  if (adminJenjang) {
    const otherJenjang = (guru.school_levels || []).filter((l: string) => l !== adminJenjang);
    validLevels = validLevels.includes(adminJenjang) ? [...otherJenjang, adminJenjang] : otherJenjang;
  }

  await guru.update({ school_levels: validLevels });
  res.json({ success: true, message: `Jenjang ${user.nama} berhasil diperbarui`, data: { school_levels: validLevels } });
};

export const toggleActive = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await findUserScoped(req, res, req.params.id as string);
  if (!user) return;
  if (user.id === req.user!.id) { res.status(400).json({ success: false, message: 'Tidak bisa menonaktifkan akun sendiri' }); return; }
  await user.update({ is_active: !user.is_active });
  res.json({ success: true, message: `Akun ${user.nama} ${user.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, data: { is_active: user.is_active } });
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await findUserScoped(req, res, req.params.id as string);
  if (!user) return;
  if (user.id === req.user!.id) { res.status(400).json({ success: false, message: 'Tidak bisa menghapus akun sendiri' }); return; }
  const nama = user.nama;
  await user.destroy();
  res.json({ success: true, message: `Akun ${nama} berhasil dihapus` });
};
