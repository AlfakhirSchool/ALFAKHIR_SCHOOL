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
  const { kelas_id, tahun_ajaran, search, page = '1', limit = '20', jenjang } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const levelWhere = await kelasIdFilter(req.user?.school_level);
  const where: Record<string, unknown> = { ...levelWhere };
  if (kelas_id) where.kelas_id = kelas_id;

  const kelasWhere: Record<string, unknown> = {};
  if (tahun_ajaran) kelasWhere.tahun_ajaran = tahun_ajaran;

  const sekolahWhere: Record<string, unknown> = {};
  if (jenjang) sekolahWhere.level = jenjang;

  const userWhere: Record<string, unknown> = {};
  if (search) {
    userWhere.nama = { [Op.iLike]: `%${search}%` };
  }

  const { count, rows } = await Siswa.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', where: userWhere, attributes: { exclude: ['password_hash'] } },
      { model: Kelas, as: 'kelas', where: kelasWhere, required: true, include: [{ model: Sekolah, as: 'sekolah', where: Object.keys(sekolahWhere).length ? sekolahWhere : undefined }] },
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
  const { email, password, nama, nisn, nis, no_induk, kelas_id, tempat_lahir, tanggal_lahir, alamat, jenis_kelamin } = req.body;

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
  const siswa = await Siswa.create({ user_id: user.id, kelas_id, nisn: finalNisn, nis, no_induk: no_induk || nis, tempat_lahir, tanggal_lahir, alamat, jenis_kelamin: jenis_kelamin || null });

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

const SHEET_ID = '1NaxhH1ORhzYGms_o98miCFxqoZCi8xRrciicPt5XHGw';
const SHEET_TABS = [
  { nama: 'SD',  gid: '0' },
  { nama: 'SMP', gid: '2540234' },
  { nama: 'SMA', gid: process.env.SHEET_SMA_GID || '' },
].filter(t => t.gid);

async function fetchSheetCsv(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseCsvRows(csv: string): { nama: string; kelas_nama: string; nis: string; status: string }[] {
  const lines = csv.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''));
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const obj: any = {};
    header.forEach((h, i) => { obj[h] = cols[i] || ''; });
    const jk = (obj['jk'] || obj['jenis_kelamin'] || '').toUpperCase().trim();
    return { nama: obj['nama'] || '', kelas_nama: obj['kelas'] || '', nis: obj['nis'] || '', status: obj['status'] || 'AKTIF', jenis_kelamin: jk === 'L' || jk === 'P' ? jk : null };
  }).filter(r => r.nama && r.nis);
}

async function doImportRows(rows: { nama: string; kelas_nama: string; nis: string; status: string; jenis_kelamin?: string | null }[]) {
  const results: { nama: string; nis: string; status: 'created' | 'skipped'; reason?: string }[] = [];
  for (const row of rows) {
    const { nama, nis, kelas_nama } = row;
    if (!nama || !nis || !kelas_nama) { results.push({ nama: nama || '?', nis: nis || '?', status: 'skipped', reason: 'Data tidak lengkap' }); continue; }
    const kelas = await Kelas.findOne({ where: { nama: { [Op.iLike]: kelas_nama } } });
    if (!kelas) { results.push({ nama, nis, status: 'skipped', reason: `Kelas "${kelas_nama}" tidak ditemukan` }); continue; }
    const autoEmail = `${nis}@siswa.alfakhir.sch.id`;
    if (await User.findOne({ where: { email: autoEmail } })) { results.push({ nama, nis, status: 'skipped', reason: 'NIS sudah terdaftar' }); continue; }
    if (await Siswa.findOne({ where: { nis } })) { results.push({ nama, nis, status: 'skipped', reason: 'NIS sudah terdaftar' }); continue; }
    const autoPassword = nis.slice(-4);
    const is_active = !row.status || row.status.toUpperCase() !== 'TIDAK AKTIF';
    const password_hash = await bcrypt.hash(autoPassword, 10);
    const user = await User.create({ email: autoEmail, password_hash, nama, role: 'siswa', password_default: autoPassword, is_active } as any);
    await Siswa.create({ user_id: user.id, kelas_id: (kelas as any).id, nisn: nis, nis, no_induk: nis, jenis_kelamin: row.jenis_kelamin || null });
    results.push({ nama, nis, status: 'created' });
  }
  return results;
}

export const syncFromSheets = async (_req: AuthRequest, res: Response): Promise<void> => {
  const allRows: { nama: string; kelas_nama: string; nis: string; status: string }[] = [];
  for (const tab of SHEET_TABS) {
    try {
      const csv = await fetchSheetCsv(tab.gid);
      allRows.push(...parseCsvRows(csv));
    } catch (e) {
      // skip tab jika gagal fetch
    }
  }
  if (allRows.length === 0) {
    res.json({ success: true, message: 'Tidak ada data baru di spreadsheet', data: [] });
    return;
  }
  const results = await doImportRows(allRows);
  const created = results.filter(r => r.status === 'created').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  res.json({ success: true, message: `${created} siswa ditambahkan, ${skipped} dilewati`, data: results });
};

export const importCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  const { rows } = req.body as { rows: { nama: string; kelas_nama: string; nis: string; status?: string }[] };
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ success: false, message: 'Data kosong' });
    return;
  }
  const results = await doImportRows(rows as any);
  const created = results.filter(r => r.status === 'created').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  res.json({ success: true, message: `${created} siswa ditambahkan, ${skipped} dilewati`, data: results });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const siswa = await Siswa.findByPk(req.params.id as string, { include: [{ model: User, as: 'user' }] });
  if (!siswa) throw createError('Siswa tidak ditemukan', 404);

  const { nama, email, kelas_id, nisn, nis, no_induk, tempat_lahir, tanggal_lahir, alamat, is_active, jenis_kelamin } = req.body;

  const userUpdate: any = {};
  if (nama !== undefined) userUpdate.nama = nama;
  if (email !== undefined) userUpdate.email = email;
  if (is_active !== undefined) userUpdate.is_active = is_active;
  if (Object.keys(userUpdate).length) await (siswa as any).user.update(userUpdate);

  const siswaUpdate: any = {};
  if (kelas_id !== undefined) siswaUpdate.kelas_id = kelas_id;
  if (nisn !== undefined) siswaUpdate.nisn = nisn;
  if (nis !== undefined) siswaUpdate.nis = nis;
  if (no_induk !== undefined) siswaUpdate.no_induk = no_induk;
  if (tempat_lahir !== undefined) siswaUpdate.tempat_lahir = tempat_lahir;
  if (tanggal_lahir !== undefined) siswaUpdate.tanggal_lahir = tanggal_lahir;
  if (alamat !== undefined) siswaUpdate.alamat = alamat;
  if (jenis_kelamin !== undefined) siswaUpdate.jenis_kelamin = jenis_kelamin || null;
  if (Object.keys(siswaUpdate).length) await siswa.update(siswaUpdate);

  res.json({ success: true, message: 'Data siswa berhasil diperbarui' });
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const siswa = await Siswa.findByPk(req.params.id as string, { include: [{ model: User, as: 'user' }] });
  if (!siswa) throw createError('Siswa tidak ditemukan', 404);

  await (siswa as any).user.update({ is_active: false });

  res.json({ success: true, message: 'Siswa berhasil dinonaktifkan' });
};
