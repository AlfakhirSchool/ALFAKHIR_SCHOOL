import { Response } from 'express';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { User, Siswa, Kelas, Sekolah } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { kelasIdFilter } from '../utils/levelFilter';

export const getSekolahList = async (_req: AuthRequest, res: Response): Promise<void> => {
  const list = await Sekolah.findAll({ attributes: ['id', 'nama', 'jenjang'], order: [['nama', 'ASC']] });
  res.json({ success: true, data: list });
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const { kelas_id, tahun_ajaran, search, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const levelWhere = await kelasIdFilter(req.user?.school_level);
  const where: Record<string, unknown> = { ...levelWhere };
  if (kelas_id) where.kelas_id = kelas_id; // override jika spesifik

  const kelasWhere: Record<string, unknown> = {};
  if (tahun_ajaran) kelasWhere.tahun_ajaran = tahun_ajaran;

  const userWhere: Record<string, unknown> = {};
  if (search) {
    userWhere.nama = { [Op.iLike]: `%${search}%` };
  }

  const { count, rows } = await Siswa.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', where: userWhere, attributes: { exclude: ['password_hash'] } },
      { model: Kelas, as: 'kelas', where: kelasWhere, include: [{ model: Sekolah, as: 'sekolah' }] },
    ],
    limit: parseInt(limit as string),
    offset,
    order: [['nisn', 'ASC']],
  });

  res.json({
    success: true,
    data: rows,
    pagination: { total: count, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(count / parseInt(limit as string)) },
  });
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  const siswa = await Siswa.findByPk(req.params.id as string, {
    include: [
      { model: User, as: 'user', attributes: { exclude: ['password_hash'] } },
      { model: Kelas, as: 'kelas', include: [{ model: Sekolah, as: 'sekolah' }] },
    ],
  });
  if (!siswa) throw createError('Siswa tidak ditemukan', 404);
  res.json({ success: true, data: siswa });
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, password, nama, nisn, nis, no_induk, kelas_id, tempat_lahir, tanggal_lahir, alamat } = req.body;

  const autoEmail = email || `${nis}@siswa.alfakhir.sch.id`;
  const autoPassword = password || nis.slice(-4);

  const existing = await User.findOne({ where: { email: autoEmail } });
  if (existing) {
    res.status(400).json({ success: false, message: 'NIS sudah terdaftar' });
    return;
  }

  const finalNisn = nisn || nis;
  const existingNisn = await Siswa.findOne({ where: { nisn: finalNisn } });
  if (existingNisn) {
    res.status(400).json({ success: false, message: nisn ? 'NISN sudah terdaftar' : 'NIS sudah terdaftar sebagai siswa' });
    return;
  }
  const password_hash = await bcrypt.hash(autoPassword, 10);

  const user = await User.create({ email: autoEmail, password_hash, nama, role: 'siswa', password_default: autoPassword } as any);
  const siswa = await Siswa.create({ user_id: user.id, kelas_id, nisn: finalNisn, nis, no_induk: no_induk || nis, tempat_lahir, tanggal_lahir, alamat });

  // Kirim ke n8n async — tidak block response
  const webhookUrl = process.env.N8N_WEBHOOK_SISWA;
  if (webhookUrl) {
    const kelasData = await Kelas.findByPk(kelas_id, { include: [{ model: Sekolah, as: 'sekolah' }] });
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama,
        nis,
        nisn: nisn || '',
        login: nis,
        password_default: autoPassword,
        kelas: (kelasData as any)?.nama || '',
        jenjang: (kelasData as any)?.sekolah?.jenjang || '',
        sekolah: (kelasData as any)?.sekolah?.nama || '',
        tanggal_dibuat: new Date().toISOString(),
      }),
    }).catch(() => {});
  }

  res.status(201).json({ success: true, message: 'Siswa berhasil dibuat', data: { user, siswa } });
};

export const importCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  const { rows } = req.body as { rows: { nama: string; kelas_nama: string; nis: string; status?: string }[] };
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ success: false, message: 'Data kosong' });
    return;
  }

  const results: { nama: string; nis: string; status: 'created' | 'skipped'; reason?: string }[] = [];

  for (const row of rows) {
    const nama = row.nama?.trim();
    const nis = row.nis?.toString().trim();
    const kelas_nama = row.kelas_nama?.trim();

    if (!nama || !nis || !kelas_nama) {
      results.push({ nama: nama || '?', nis: nis || '?', status: 'skipped', reason: 'Data tidak lengkap' });
      continue;
    }

    // cari kelas by nama
    const kelas = await Kelas.findOne({ where: { nama: { [Op.iLike]: kelas_nama } } });
    if (!kelas) {
      results.push({ nama, nis, status: 'skipped', reason: `Kelas "${kelas_nama}" tidak ditemukan` });
      continue;
    }

    const autoEmail = `${nis}@siswa.alfakhir.sch.id`;
    const existingUser = await User.findOne({ where: { email: autoEmail } });
    if (existingUser) {
      results.push({ nama, nis, status: 'skipped', reason: 'NIS sudah terdaftar' });
      continue;
    }

    const existingSiswa = await Siswa.findOne({ where: { nis } });
    if (existingSiswa) {
      results.push({ nama, nis, status: 'skipped', reason: 'NIS sudah terdaftar' });
      continue;
    }

    const autoPassword = nis.slice(-4);
    const is_active = !row.status || row.status.toUpperCase() !== 'TIDAK AKTIF';
    const password_hash = await bcrypt.hash(autoPassword, 10);
    const user = await User.create({ email: autoEmail, password_hash, nama, role: 'siswa', password_default: autoPassword, is_active } as any);
    await Siswa.create({ user_id: user.id, kelas_id: (kelas as any).id, nisn: nis, nis, no_induk: nis });

    results.push({ nama, nis, status: 'created' });
  }

  const created = results.filter(r => r.status === 'created').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  res.json({ success: true, message: `${created} siswa ditambahkan, ${skipped} dilewati`, data: results });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const siswa = await Siswa.findByPk(req.params.id as string, { include: [{ model: User, as: 'user' }] });
  if (!siswa) throw createError('Siswa tidak ditemukan', 404);

  const { nama, email, kelas_id, nisn, nis, no_induk, tempat_lahir, tanggal_lahir, alamat, is_active } = req.body;

  await (siswa as any).user.update({ nama, email, is_active });
  await siswa.update({ kelas_id, nisn, nis, no_induk, tempat_lahir, tanggal_lahir, alamat });

  res.json({ success: true, message: 'Data siswa berhasil diperbarui' });
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const siswa = await Siswa.findByPk(req.params.id as string, { include: [{ model: User, as: 'user' }] });
  if (!siswa) throw createError('Siswa tidak ditemukan', 404);

  await (siswa as any).user.update({ is_active: false });

  res.json({ success: true, message: 'Siswa berhasil dinonaktifkan' });
};
