import { Response } from 'express';
import bcrypt from 'bcrypt';
import { Op, QueryTypes } from 'sequelize';
import { User, Guru, Siswa, OrangTua, Kelas, Sekolah } from '../models';
import { AuthRequest } from '../middleware/auth';
import sequelize from '../config/database';

const VALID_JENJANG = ['SD', 'SMP', 'SMA'];

// Returns an error message string, or null if the target user is within the admin's scope
const assertInScope = async (adminJenjang: string | null, targetUserId: string, target?: InstanceType<typeof User>): Promise<string | null> => {
  if (!adminJenjang) return null; // master admin: unrestricted
  if (!VALID_JENJANG.includes(adminJenjang)) return 'Jenjang admin tidak valid';

  const user = target ?? await User.findByPk(targetUserId);
  if (!user) return 'User tidak ditemukan';

  if (user.role === 'admin') {
    return user.school_level === adminJenjang ? null : `Hanya dapat mengelola Admin ${adminJenjang}`;
  }

  if (user.role === 'guru') {
    const guru = await Guru.findOne({ where: { user_id: targetUserId } });
    if (!guru) return null; // guru record belum ada, izinkan (akun baru)
    if (!guru.school_levels || guru.school_levels.length === 0) return null; // belum di-assign jenjang, izinkan
    return guru.school_levels.includes(adminJenjang) ? null : `Guru ini tidak mengajar di ${adminJenjang}`;
  }

  if (user.role === 'siswa') {
    const rows = await sequelize.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM siswa s
       JOIN kelas k ON s.kelas_id = k.id
       JOIN sekolah sch ON k.sekolah_id = sch.id
       WHERE s.user_id = :uid AND sch.level = :jenjang`,
      { replacements: { uid: targetUserId, jenjang: adminJenjang }, type: QueryTypes.SELECT }
    );
    return rows[0]?.cnt !== '0' ? null : `Siswa ini bukan lingkup ${adminJenjang}`;
  }

  if (user.role === 'ortu') {
    const rows = await sequelize.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM orang_tua ot
       JOIN siswa s ON ot.siswa_id = s.id
       JOIN kelas k ON s.kelas_id = k.id
       JOIN sekolah sch ON k.sekolah_id = sch.id
       WHERE ot.user_id = :uid AND sch.level = :jenjang`,
      { replacements: { uid: targetUserId, jenjang: adminJenjang }, type: QueryTypes.SELECT }
    );
    return rows[0]?.cnt !== '0' ? null : `Orang tua ini bukan lingkup ${adminJenjang}`;
  }

  return null;
};

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { role, search, page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const adminJenjang = req.user?.school_level ?? null;

  const where: any = {};
  if (role) where.role = role;
  if (search) {
    where[Op.or] = [
      { nama: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // Jenjang admin: filter berdasarkan lingkup jenjang
  if (adminJenjang && VALID_JENJANG.includes(adminJenjang)) {
    const j = adminJenjang;
    if (role === 'admin') {
      where.school_level = j;
    } else if (role === 'guru') {
      where[Op.and] = [sequelize.literal(
        `EXISTS (SELECT 1 FROM guru g WHERE g.user_id = "User"."id" AND '${j}' = ANY(g.school_levels))`
      )];
    } else if (role === 'siswa') {
      where[Op.and] = [sequelize.literal(
        `EXISTS (SELECT 1 FROM siswa s JOIN kelas k ON s.kelas_id = k.id JOIN sekolah sch ON k.sekolah_id = sch.id WHERE s.user_id = "User"."id" AND sch.level = '${j}')`
      )];
    } else if (role === 'ortu') {
      where[Op.and] = [sequelize.literal(
        `EXISTS (SELECT 1 FROM orang_tua ot JOIN siswa s ON ot.siswa_id = s.id JOIN kelas k ON s.kelas_id = k.id JOIN sekolah sch ON k.sekolah_id = sch.id WHERE ot.user_id = "User"."id" AND sch.level = '${j}')`
      )];
    } else {
      // Tidak ada filter role: tampilkan semua role dalam lingkup jenjang ini
      where[Op.and] = [sequelize.literal(`(
        ("User"."role" = 'admin' AND "User"."school_level" = '${j}') OR
        ("User"."role" = 'guru' AND EXISTS (SELECT 1 FROM guru g WHERE g.user_id = "User"."id" AND '${j}' = ANY(g.school_levels))) OR
        ("User"."role" = 'siswa' AND EXISTS (SELECT 1 FROM siswa s JOIN kelas k ON s.kelas_id = k.id JOIN sekolah sch ON k.sekolah_id = sch.id WHERE s.user_id = "User"."id" AND sch.level = '${j}')) OR
        ("User"."role" = 'ortu' AND EXISTS (SELECT 1 FROM orang_tua ot JOIN siswa s ON ot.siswa_id = s.id JOIN kelas k ON s.kelas_id = k.id JOIN sekolah sch ON k.sekolah_id = sch.id WHERE ot.user_id = "User"."id" AND sch.level = '${j}'))
      )`)];
    }
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password_hash'] },
    include: [{ model: Guru, as: 'guru_detail', attributes: ['id', 'school_levels'], required: false }],
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
  const user = await User.findByPk(req.params.id as string, { attributes: { exclude: ['password_hash'] } });
  if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return; }

  const adminJenjang = req.user?.school_level ?? null;
  const scopeErr = await assertInScope(adminJenjang, req.params.id as string, user);
  if (scopeErr) { res.status(403).json({ success: false, message: scopeErr }); return; }

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
  const adminJenjang = req.user?.school_level ?? null;

  if (!email || !password || !nama || !role) {
    res.status(400).json({ success: false, message: 'email, password, nama, role wajib diisi' });
    return;
  }

  // Jenjang admin: hanya boleh buat admin se-jenjang, tidak boleh buat master admin
  if (adminJenjang && role === 'admin') {
    if (!school_level || school_level !== adminJenjang) {
      res.status(403).json({
        success: false,
        message: `Admin ${adminJenjang} hanya dapat membuat akun Admin ${adminJenjang}`,
      });
      return;
    }
  }

  const exists = await User.findOne({ where: { email } });
  if (exists) { res.status(400).json({ success: false, message: 'Email sudah terdaftar' }); return; }

  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email, password_hash, nama, role,
    school_level: role === 'admin' ? (school_level || null) : null,
    is_active: true,
  });

  // Otomatis buat record guru agar fitur set-jenjang langsung bisa dipakai
  if (role === 'guru') {
    await Guru.create({ user_id: user.id, school_levels: [] });

    const webhookUrl = process.env.N8N_WEBHOOK_GURU;
    if (webhookUrl) {
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama,
          login: email.split('@')[0],
          password_default: password,
          pelajaran: '',
          jenjang: school_level || '',
          tanggal_dibuat: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
  }

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

  const user = await User.findByPk(req.params.id as string);
  if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return; }

  const scopeErr = await assertInScope(req.user?.school_level ?? null, req.params.id as string, user);
  if (scopeErr) { res.status(403).json({ success: false, message: scopeErr }); return; }

  const password_hash = await bcrypt.hash(password, 10);
  await user.update({ password_hash });

  res.json({ success: true, message: `Password ${user.nama} berhasil direset` });
};

export const setGuruJenjang = async (req: AuthRequest, res: Response): Promise<void> => {
  const { school_levels } = req.body;
  if (!Array.isArray(school_levels)) {
    res.status(400).json({ success: false, message: 'school_levels harus berupa array' });
    return;
  }

  const user = await User.findByPk(req.params.id as string);
  if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return; }
  if (user.role !== 'guru') { res.status(400).json({ success: false, message: 'Hanya berlaku untuk role guru' }); return; }

  // Scope check untuk jenjang admin: hanya boleh assign jenjang milik mereka
  const adminJenjang = req.user?.school_level ?? null;
  if (adminJenjang) {
    const newLevels = school_levels.filter((l: string) => VALID_JENJANG.includes(l));
    // Jenjang admin tidak boleh menambahkan jenjang lain ke guru
    const hasOtherJenjang = newLevels.some((l: string) => l !== adminJenjang);
    if (hasOtherJenjang) {
      res.status(403).json({ success: false, message: `Admin ${adminJenjang} hanya dapat mengatur jenjang ${adminJenjang}` });
      return;
    }
  }

  // Auto-create guru record jika belum ada (guru dibuat via Kelola Akun)
  let guru = await Guru.findOne({ where: { user_id: user.id } });
  if (!guru) { guru = await Guru.create({ user_id: user.id, school_levels: [] }); }

  let validLevels = school_levels.filter((l: string) => VALID_JENJANG.includes(l));

  // Jenjang admin: merge dengan jenjang yang sudah ada (jangan hapus jenjang dari admin lain)
  if (adminJenjang) {
    const existing = guru.school_levels || [];
    const otherJenjang = existing.filter((l: string) => l !== adminJenjang);
    // Kalau admin SD set jenjang = [SD], gabungkan dengan jenjang lain yang sudah ada (SMP/SMA)
    // Kalau admin SD hapus SD (set = []), SD dihapus dari array
    const wantsThis = validLevels.includes(adminJenjang);
    validLevels = wantsThis ? [...otherJenjang, adminJenjang] : otherJenjang;
  }

  await guru.update({ school_levels: validLevels });

  res.json({ success: true, message: `Jenjang ${user.nama} berhasil diperbarui`, data: { school_levels: validLevels } });
};

export const toggleActive = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByPk(req.params.id as string);
  if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return; }

  if (user.id === req.user!.id) {
    res.status(400).json({ success: false, message: 'Tidak bisa menonaktifkan akun sendiri' });
    return;
  }

  const scopeErr = await assertInScope(req.user?.school_level ?? null, req.params.id as string, user);
  if (scopeErr) { res.status(403).json({ success: false, message: scopeErr }); return; }

  await user.update({ is_active: !user.is_active });
  res.json({ success: true, message: `Akun ${user.nama} ${user.is_active ? 'diaktifkan' : 'dinonaktifkan'}`, data: { is_active: user.is_active } });
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByPk(req.params.id as string);
  if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return; }

  if (user.id === req.user!.id) {
    res.status(400).json({ success: false, message: 'Tidak bisa menghapus akun sendiri' });
    return;
  }

  const scopeErr = await assertInScope(req.user?.school_level ?? null, req.params.id as string, user);
  if (scopeErr) { res.status(403).json({ success: false, message: scopeErr }); return; }

  const nama = user.nama;
  await user.destroy();
  res.json({ success: true, message: `Akun ${nama} berhasil dihapus` });
};
