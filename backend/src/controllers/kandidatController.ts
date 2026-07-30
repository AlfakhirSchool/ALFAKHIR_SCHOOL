import { Response } from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import { Kandidat, Guru, User, Siswa, Kelas, Sekolah, CatatanPewawancara, HasilTesAkademik, RingkasanAI } from '../models';
import { AuthRequest } from '../middleware/auth';
import { kelasIdFilter } from '../utils/levelFilter';

function getTahunAjaran() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const { level, status, search, page = '1', limit = '20', tahun_ajaran } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = {};
  if (level) where.level = level;
  else if (req.user?.school_level) where.level = req.user.school_level;
  if (status) where.status = status;
  if (tahun_ajaran) where.tahun_ajaran = tahun_ajaran;
  if (search) where.nama = { [Op.iLike]: `%${search}%` };

  const { count, rows } = await Kandidat.findAndCountAll({
    where,
    include: [
      { model: Guru, as: 'pewawancara', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
      { model: HasilTesAkademik, as: 'hasil_tes', attributes: ['total_skor'] },
      { model: RingkasanAI, as: 'ringkasan_ai', attributes: ['ringkasan'] },
    ],
    limit: parseInt(limit as string),
    offset,
    order: [['created_at', 'DESC']],
  });

  // Stats
  const baseWhere = req.user?.school_level ? { level: req.user.school_level } : {};
  const [total, pending, review, diterima, ditolak] = await Promise.all([
    Kandidat.count({ where: baseWhere }),
    Kandidat.count({ where: { ...baseWhere, status: 'PENDING' } }),
    Kandidat.count({ where: { ...baseWhere, status: 'REVIEW' } }),
    Kandidat.count({ where: { ...baseWhere, status: 'DITERIMA' } }),
    Kandidat.count({ where: { ...baseWhere, status: 'DITOLAK' } }),
  ]);

  res.json({
    success: true,
    data: rows,
    stats: { total, pending, review, diterima, ditolak },
    pagination: { total: count, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(count / parseInt(limit as string)) },
  });
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  const { nama, level, nama_ortu, no_telp_ortu, email_ortu, asal_sekolah, jenis_kelamin, tanggal_lahir, tahun_ajaran } = req.body;
  if (!nama || !level) {
    res.status(400).json({ success: false, message: 'nama dan level wajib diisi' });
    return;
  }
  const kandidat = await Kandidat.create({
    nama,
    level,
    nama_ortu: nama_ortu || null,
    no_telp_ortu: no_telp_ortu || null,
    email_ortu: email_ortu || null,
    asal_sekolah: asal_sekolah || null,
    jenis_kelamin: jenis_kelamin || null,
    tanggal_lahir: tanggal_lahir || null,
    tahun_ajaran: tahun_ajaran || getTahunAjaran(),
    status: 'PENDING',
  });
  res.status(201).json({ success: true, data: kandidat });
};

export const getOne = async (req: AuthRequest, res: Response): Promise<void> => {
  const k = await Kandidat.findByPk(req.params.id as string, {
    include: [
      { model: Guru, as: 'pewawancara', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
      { model: CatatanPewawancara, as: 'catatan_list', order: [['created_at', 'ASC']] as any },
      { model: HasilTesAkademik, as: 'hasil_tes' },
      { model: RingkasanAI, as: 'ringkasan_ai' },
    ],
  });
  if (!k) { res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan' }); return; }
  res.json({ success: true, data: k });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const k = await Kandidat.findByPk(req.params.id as string);
  if (!k) { res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan' }); return; }
  const allowed = ['nama', 'nama_diperbaiki', 'level', 'status', 'nama_ortu', 'no_telp_ortu', 'email_ortu',
    'email_siswa', 'asal_sekolah', 'jenis_kelamin', 'tanggal_lahir', 'catatan', 'ruangan',
    'pewawancara_id', 'pewawancara_nama', 'skor_akademik', 'rekomendasi'];
  const updates: any = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  await k.update(updates);
  res.json({ success: true, data: k });
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const k = await Kandidat.findByPk(req.params.id as string);
  if (!k) { res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan' }); return; }
  await k.destroy();
  res.json({ success: true, message: 'Kandidat dihapus' });
};

export const daftarkan = async (req: AuthRequest, res: Response): Promise<void> => {
  const k = await Kandidat.findByPk(req.params.id as string);
  if (!k) { res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan' }); return; }
  if (k.siswa_id) { res.status(409).json({ success: false, message: 'Kandidat sudah terdaftar sebagai siswa' }); return; }

  const { kelas_id, nis, nisn } = req.body;
  if (!kelas_id) { res.status(400).json({ success: false, message: 'kelas_id wajib diisi' }); return; }

  const kelas = await Kelas.findByPk(kelas_id);
  if (!kelas) { res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' }); return; }

  const slug = k.nama.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
  const ts = Date.now().toString().slice(-4);
  const autoEmail = `${slug}.${ts}@siswa.alfakhir.sch.id`;
  const autoPassword = Math.random().toString(36).slice(-6).toUpperCase();
  const password_hash = await bcrypt.hash(autoPassword, 10);

  const user = await User.create({
    email: autoEmail, password_hash, nama: k.nama,
    role: 'siswa', password_default: autoPassword, is_active: true,
  } as any);

  const siswa = await Siswa.create({
    user_id: (user as any).id,
    kelas_id,
    nisn: nisn || null,
    nis: nis || null,
    no_induk: nis || null,
    jenis_kelamin: k.jenis_kelamin || null,
    tanggal_lahir: k.tanggal_lahir ? new Date(k.tanggal_lahir) : null,
  } as any);

  await k.update({ status: 'DITERIMA', siswa_id: (siswa as any).id });

  res.json({ success: true, message: `${k.nama} berhasil didaftarkan`, email: autoEmail, password: autoPassword });
};

// Public — tidak butuh auth
export const daftarPublik = async (req: any, res: Response): Promise<void> => {
  const { nama, level, nama_ortu, no_telp_ortu, email_ortu, asal_sekolah, jenis_kelamin, tanggal_lahir } = req.body;
  if (!nama || !level) {
    res.status(400).json({ success: false, message: 'nama dan level wajib diisi' });
    return;
  }
  const kandidat = await Kandidat.create({
    nama, level,
    nama_ortu: nama_ortu || null,
    no_telp_ortu: no_telp_ortu || null,
    email_ortu: email_ortu || null,
    asal_sekolah: asal_sekolah || null,
    jenis_kelamin: jenis_kelamin || null,
    tanggal_lahir: tanggal_lahir || null,
    tahun_ajaran: getTahunAjaran(),
    status: 'PENDING',
  });
  res.status(201).json({ success: true, message: 'Pendaftaran berhasil! Tim kami akan menghubungi Anda.', id: kandidat.id });
};
