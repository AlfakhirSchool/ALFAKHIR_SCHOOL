import { Response } from 'express';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { User, Siswa, Kelas, Sekolah } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { kelasIdFilter } from '../utils/levelFilter';

const pick = (src: any, keys: string[]) =>
  Object.fromEntries(keys.filter(k => src[k] !== undefined).map(k => [k, src[k]]));

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  const siswa = await Siswa.findOne({
    where: { user_id: req.user!.id },
    include: [{ model: Kelas, as: 'kelas', attributes: ['id', 'nama'] }],
  });
  if (!siswa) { res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan' }); return; }
  res.json({ success: true, data: siswa });
};

export const getSekolahList = async (_req: AuthRequest, res: Response): Promise<void> => {
  const list = await Sekolah.findAll({ attributes: ['id', 'nama', 'level'], order: [['nama', 'ASC']] });
  res.json({ success: true, data: list });
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const { kelas_id, tahun_ajaran, search, page = '1', limit = '20', jenjang } = req.query;
  const p = parseInt(page as string);
  const lim = parseInt(limit as string);
  const offset = (p - 1) * lim;

  const levelWhere = await kelasIdFilter(req.user?.school_level);
  const where: Record<string, unknown> = { ...levelWhere };
  if (kelas_id) where.kelas_id = kelas_id;

  const kelasWhere: Record<string, unknown> = {};
  if (tahun_ajaran) kelasWhere.tahun_ajaran = tahun_ajaran;

  const sekolahWhere: Record<string, unknown> = {};
  if (jenjang) sekolahWhere.level = jenjang;

  const { count, rows } = await Siswa.findAndCountAll({
    where,
    include: [
      { model: User, as: 'user', where: search ? { nama: { [Op.iLike]: `%${search}%` } } : undefined, attributes: { exclude: ['password_hash', 'password_default'] } },
      { model: Kelas, as: 'kelas', where: kelasWhere, required: false, include: [{ model: Sekolah, as: 'sekolah', where: Object.keys(sekolahWhere).length ? sekolahWhere : undefined }] },
    ],
    limit: lim, offset,
    order: [['nisn', 'ASC']],
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: p, limit: lim, totalPages: Math.ceil(count / lim) } });
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role === 'siswa') {
    const ownSiswa = await Siswa.findOne({ where: { user_id: req.user!.id } });
    if (!ownSiswa || (ownSiswa as any).id !== req.params.id) throw createError('Akses ditolak', 403);
  }
  const siswa = await Siswa.findByPk(req.params.id as string, {
    include: [
      { model: User, as: 'user', attributes: { exclude: ['password_hash', 'password_default'] } },
      { model: Kelas, as: 'kelas', include: [{ model: Sekolah, as: 'sekolah' }] },
    ],
  });
  if (!siswa) throw createError('Siswa tidak ditemukan', 404);
  res.json({ success: true, data: siswa });
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  const { password, nama, nisn, nis, no_induk, kelas_id, tempat_lahir, tanggal_lahir, alamat, jenis_kelamin } = req.body;
  const autoPassword = password || (nis ? nis.slice(-4) : Math.random().toString(36).slice(-4));
  const finalNisn = nisn || nis;

  if (finalNisn && await Siswa.findOne({ where: { nisn: finalNisn } })) {
    res.status(400).json({ success: false, message: nisn ? 'NISN sudah terdaftar' : 'NIS sudah terdaftar sebagai siswa' }); return;
  }

  const user = await User.create({ username: nis || null, password_hash: await bcrypt.hash(autoPassword, 10), nama, role: 'siswa', password_default: autoPassword } as any);
  const siswa = await Siswa.create({ user_id: user.id, kelas_id, nisn: finalNisn, nis, no_induk: no_induk || nis, tempat_lahir, tanggal_lahir, alamat, jenis_kelamin: jenis_kelamin || null });

  const webhookUrl = process.env.N8N_WEBHOOK_SISWA;
  if (webhookUrl) {
    const kelasData = await Kelas.findByPk(kelas_id, { include: [{ model: Sekolah, as: 'sekolah' }] }) as any;
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, nis, nisn: nisn || '', login: nis, password_default: autoPassword, kelas: kelasData?.nama || '', jenjang: kelasData?.sekolah?.jenjang || '', sekolah: kelasData?.sekolah?.nama || '', tanggal_dibuat: new Date().toISOString() }),
    }).catch(() => {});
  }

  res.status(201).json({ success: true, message: 'Siswa berhasil dibuat', data: { user, siswa } });
};

const SHEET_ID = '1NaxhH1ORhzYGms_o98miCFxqoZCi8xRrciicPt5XHGw';
const SHEET_TABS = [{ nama: 'SD', gid: '0' }];

async function fetchSheetCsv(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

function parseCsvRows(csv: string): { nama: string; kelas_nama: string; nis: string; status: string; jenis_kelamin: string | null }[] {
  const lines = csv.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''));
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const obj: any = {};
    header.forEach((h, i) => { obj[h] = cols[i] || ''; });
    const jk = (obj['jk'] || obj['jenis_kelamin'] || '').toUpperCase().trim();
    return { nama: obj['nama'] || '', kelas_nama: obj['kelas'] || '', nis: obj['nis'] || '', status: obj['status'] || 'AKTIF', jenis_kelamin: jk === 'L' || jk === 'P' ? jk : null };
  }).filter(r => r.nama);
}

async function doImportRows(rows: { nama: string; kelas_nama: string; nis: string; status: string; jenis_kelamin?: string | null }[]) {
  const results: { nama: string; nis: string; status: 'created' | 'updated' | 'skipped'; reason?: string }[] = [];

  for (const row of rows) {
    const { nama, kelas_nama } = row;
    let { nis } = row;
    if (!nama || !kelas_nama) { results.push({ nama: nama || '?', nis: nis || '?', status: 'skipped', reason: 'Data tidak lengkap' }); continue; }

    let kelas = await Kelas.findOne({ where: { nama: { [Op.iLike]: kelas_nama } } });
    if (!kelas) kelas = await Kelas.findOne({ where: { nama: { [Op.iLike]: `%${kelas_nama}%` } } });
    if (!kelas) { results.push({ nama, nis: nis || '', status: 'skipped', reason: `Kelas "${kelas_nama}" tidak ditemukan` }); continue; }

    const existingByNama = await Siswa.findOne({ where: { kelas_id: (kelas as any).id }, include: [{ model: User, as: 'user', where: { nama: { [Op.iLike]: nama } } }] }) as any;
    if (existingByNama) {
      const hasNis = existingByNama.nis && !existingByNama.nis.toString().startsWith('TMP');
      if (nis && !hasNis) {
        try {
          const autoPassword = nis.slice(-4);
          await existingByNama.update({ nis, nisn: nis, no_induk: nis });
          await existingByNama.user.update({ username: nis, password_hash: await bcrypt.hash(autoPassword, 10), password_default: autoPassword });
          results.push({ nama, nis, status: 'updated', reason: 'NIS diperbarui dari Sheets' });
        } catch (err: any) {
          results.push({ nama, nis, status: 'skipped', reason: `Gagal update NIS: ${err.message}` });
        }
      } else {
        results.push({ nama, nis: nis || '', status: 'skipped', reason: `Siswa "${nama}" sudah ada di kelas ${(kelas as any).nama}` });
      }
      continue;
    }

    if (nis && await Siswa.findOne({ where: { nis } })) { results.push({ nama, nis, status: 'skipped', reason: 'NIS sudah terdaftar' }); continue; }

    const autoPassword = nis ? nis.slice(-4) : Math.random().toString(36).slice(-4);
    const is_active = !row.status || row.status.toUpperCase() !== 'TIDAK AKTIF';
    const user = await User.create({ username: nis || null, password_hash: await bcrypt.hash(autoPassword, 10), nama, role: 'siswa', password_default: nis ? autoPassword : null, is_active } as any);
    await Siswa.create({ user_id: user.id, kelas_id: (kelas as any).id, nisn: nis || null, nis: nis || null, no_induk: nis || null, jenis_kelamin: row.jenis_kelamin || null });
    results.push({ nama, nis, status: 'created' });
  }
  return results;
}

export const syncFromSheets = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allRows: ReturnType<typeof parseCsvRows> = [];
    for (const tab of SHEET_TABS) {
      try { allRows.push(...parseCsvRows(await fetchSheetCsv(tab.gid))); } catch { /* skip tab gagal */ }
    }
    if (!allRows.length) { res.json({ success: true, message: 'Tidak ada data baru di spreadsheet', data: [] }); return; }

    const results = await doImportRows(allRows);
    const counts = results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {} as Record<string, number>);
    const parts = [`${counts.created || 0} siswa ditambahkan`, counts.updated ? `${counts.updated} diperbarui NIS-nya` : null, `${counts.skipped || 0} dilewati`].filter(Boolean);
    res.json({ success: true, message: parts.join(', '), data: results });
  } catch (e: any) {
    res.status(500).json({ success: false, message: `Gagal sync: ${e?.message || 'Error tidak diketahui'}` });
  }
};

export const importCsv = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rows } = req.body as { rows: { nama: string; kelas_nama: string; nis: string; status?: string }[] };
    if (!rows?.length) { res.status(400).json({ success: false, message: 'Data kosong' }); return; }
    const results = await doImportRows(rows as any);
    const counts = results.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {} as Record<string, number>);
    res.json({ success: true, message: `${counts.created || 0} siswa ditambahkan, ${counts.skipped || 0} dilewati`, data: results });
  } catch (e: any) {
    res.status(500).json({ success: false, message: `Gagal import: ${e?.message || 'Error tidak diketahui'}` });
  }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const siswa = await Siswa.findByPk(req.params.id as string, { include: [{ model: User, as: 'user' }] });
  if (!siswa) throw createError('Siswa tidak ditemukan', 404);

  const userUpdate = pick(req.body, ['nama', 'is_active']);
  if (Object.keys(userUpdate).length) await (siswa as any).user.update(userUpdate);

  const siswaUpdate = pick(req.body, ['kelas_id', 'nisn', 'nis', 'no_induk', 'tempat_lahir', 'tanggal_lahir', 'alamat']);
  if (req.body.jenis_kelamin !== undefined) siswaUpdate.jenis_kelamin = req.body.jenis_kelamin || null;
  if (Object.keys(siswaUpdate).length) await siswa.update(siswaUpdate);

  res.json({ success: true, message: 'Data siswa berhasil diperbarui' });
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const siswa = await Siswa.findByPk(req.params.id as string, { include: [{ model: User, as: 'user' }] });
  if (!siswa) throw createError('Siswa tidak ditemukan', 404);
  await (siswa as any).user.update({ is_active: false });
  res.json({ success: true, message: 'Siswa berhasil dinonaktifkan' });
};

export const uploadPhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = (req as any).file;
  if (!file) { res.status(400).json({ success: false, message: 'File tidak ditemukan' }); return; }

  const siswa = await Siswa.findByPk(String(req.params.id), { include: [{ model: User, as: 'user' }] });
  if (!siswa) throw createError('Siswa tidak ditemukan', 404);

  const user = (siswa as any).user as User;
  if (user.profile_pic) {
    const oldPath = path.join(__dirname, '..', '..', user.profile_pic.replace(/^\//, ''));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const profilePicUrl = `/uploads/profiles/${file.filename}`;
  await user.update({ profile_pic: profilePicUrl });
  res.json({ success: true, data: { profile_pic: profilePicUrl } });
};
