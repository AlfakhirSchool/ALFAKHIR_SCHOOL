import { Response } from 'express';
import { Op } from 'sequelize';
import { Kandidat, Guru, User, Kelas, CatatanPewawancara, HasilTesAkademik, RingkasanAI, JawabanForm } from '../models';
import { AuthRequest } from '../middleware/auth';
import sequelize from '../config/database';
import { kelasIdFilter } from '../utils/levelFilter';
import { getTahunAjaran } from '../utils/getTahunAjaran';
import { createSiswaWithAccount } from '../utils/createSiswaFromKandidat';
import { logAction } from '../middleware/auditLog';

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const { level, status, search, page = '1', limit = '20', tahun_ajaran } = req.query;
  const limitCapped = Math.min(parseInt(limit as string) || 20, 100);
  const offset = (parseInt(page as string) - 1) * limitCapped;

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
    limit: limitCapped,
    offset,
    order: [['created_at', 'DESC']],
  });

  // Stats — satu query GROUP BY status
  const baseWhere = req.user?.school_level ? { level: req.user.school_level } : {};
  const statRows = await Kandidat.findAll({
    where: baseWhere,
    attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
    group: ['status'],
    raw: true,
  }) as any[];
  const statMap: Record<string, number> = {};
  let total = 0;
  for (const r of statRows) { statMap[r.status] = parseInt(r.count, 10); total += parseInt(r.count, 10); }
  const pending = statMap['PENDING'] || 0;
  const review = statMap['REVIEW'] || 0;
  const diterima = statMap['DITERIMA'] || 0;
  const ditolak = statMap['DITOLAK'] || 0;

  res.json({
    success: true,
    data: rows,
    stats: { total, pending, review, diterima, ditolak },
    pagination: { total: count, page: parseInt(page as string), limit: limitCapped, totalPages: Math.ceil(count / limitCapped) },
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
      { model: JawabanForm, as: 'jawaban_form_list' },
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
  try {
    await k.destroy();
  } catch (err: any) {
    if (err?.original?.code === '23503' || err?.message?.includes('foreign key')) {
      res.status(409).json({ success: false, message: 'Kandidat tidak dapat dihapus karena memiliki data terkait (catatan, hasil tes). Hapus data terkait dulu.' });
      return;
    }
    throw err;
  }
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

  const { siswa, password } = await createSiswaWithAccount({
    nama: k.nama, kelas_id, nisn: nisn || null, nis: nis || null, no_induk: nis || null,
    jenis_kelamin: k.jenis_kelamin || null,
    tanggal_lahir: k.tanggal_lahir ? new Date(k.tanggal_lahir) : null,
  });
  await k.update({ status: 'DITERIMA', siswa_id: (siswa as any).id });

  logAction({
    user_id: req.user!.id, nama: req.user!.nama, role: req.user!.role,
    school_level: req.user!.school_level,
    action: 'Daftarkan Kandidat', table: 'siswa', record_id: (siswa as any).id,
    new_value: { note: 'password awal diberikan ke admin' } as any,
    ip: req.ip,
  });

  res.json({ success: true, message: `${k.nama} berhasil didaftarkan`, password });
};

// Public — tidak butuh auth
// Publik: cari kandidat untuk portal tes
export const cariPublik = async (req: any, res: Response): Promise<void> => {
  const { search, level } = req.query;
  const where: any = { status: ['PENDING', 'REVIEW'] };
  if (level) where.level = level;
  if (search) where.nama = { [Op.iLike]: `%${search}%` };
  const kandidat = await Kandidat.findAll({
    where,
    attributes: ['id', 'nama', 'nama_diperbaiki', 'level', 'tahun_ajaran'],
    order: [['nama', 'ASC']],
    limit: 50,
  });
  res.json({ success: true, data: kandidat });
};

// Publik: info kandidat untuk halaman tes
export const infoPublik = async (req: any, res: Response): Promise<void> => {
  const k = await Kandidat.findByPk(req.params.id as string, {
    attributes: ['id', 'nama', 'nama_diperbaiki', 'level', 'tahun_ajaran'],
    include: [{ model: HasilTesAkademik, as: 'hasil_tes', attributes: ['total_skor'] }],
  });
  if (!k) { res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan' }); return; }
  res.json({ success: true, data: k });
};

export const generateRingkasanAI = async (req: any, res: Response): Promise<void> => {
  const k = await Kandidat.findByPk(req.params.id as string, {
    include: [
      { model: CatatanPewawancara, as: 'catatan_list' },
      { model: HasilTesAkademik, as: 'hasil_tes' },
    ],
  });
  if (!k) { res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan' }); return; }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { res.status(500).json({ success: false, message: 'GEMINI_API_KEY tidak dikonfigurasi' }); return; }

  const catatan = (k as any).catatan_list || [];
  const hasil = (k as any).hasil_tes;

  const prompt = `Kamu adalah asisten penerimaan siswa baru di SMP Islam Al Fakhir. Buat ringkasan singkat (maksimal 200 kata) tentang kandidat berikut berdasarkan data wawancara. Ringkasan harus profesional dan membantu tim untuk mengambil keputusan.

Nama: ${k.nama_diperbaiki || k.nama}
Jenjang: ${k.level}
Status: ${k.status}
Asal Sekolah: ${k.asal_sekolah || 'tidak diketahui'}
Jenis Kelamin: ${k.jenis_kelamin === 'L' ? 'Laki-laki' : k.jenis_kelamin === 'P' ? 'Perempuan' : 'tidak diketahui'}
Skor Akademik: ${hasil ? hasil.total_skor : 'belum tes'}

Catatan Pewawancara:
${catatan.length === 0 ? 'Belum ada catatan.' : catatan.map((c: any, i: number) => `\nCatatan ${i + 1} (oleh ${c.pewawancara_nama || 'tidak diketahui'}):\n- Observasi: ${c.observasi || '-'}\n- Penilaian Akademik: ${c.penilaian_akademik || '-'}\n- Dukungan Keluarga: ${c.dukungan_keluarga || '-'}\n- Karakter: ${c.catatan_karakter || '-'}\n- Lain-lain: ${c.catatan_lain || '-'}\n- Rekomendasi: ${c.rekomendasi || '-'}`).join('\n')}

Tuliskan ringkasan dalam Bahasa Indonesia yang profesional.`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!geminiRes.ok) {
    const err = await geminiRes.text().catch(() => '');
    res.status(502).json({ success: false, message: 'Gemini API error: ' + err }); return;
  }
  let ringkasanText = '';
  try {
    const geminiData: any = await geminiRes.json();
    ringkasanText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch {
    res.status(502).json({ success: false, message: 'Gemini response tidak valid' }); return;
  }
  if (!ringkasanText) { res.status(502).json({ success: false, message: 'Gemini tidak menghasilkan teks' }); return; }

  const [ringkasan] = await RingkasanAI.upsert({ kandidat_id: k.id, ringkasan: ringkasanText });
  res.json({ success: true, data: ringkasan });
};

export const monitorPewawancara = async (req: any, res: Response): Promise<void> => {
  const { level, tahun_ajaran } = req.query;
  const where: any = {};
  if (level) where.level = level;
  if (tahun_ajaran) where.tahun_ajaran = tahun_ajaran;

  const kandidat = await Kandidat.findAll({
    where,
    attributes: ['id', 'status', 'pewawancara_id', 'pewawancara_nama', 'level'],
    include: [
      { model: Guru, as: 'pewawancara', include: [{ model: User, as: 'user', attributes: ['nama', 'email'] }] },
      { model: CatatanPewawancara, as: 'catatan_list', attributes: ['id', 'is_locked'] },
    ],
  });

  const map: Record<string, any> = {};
  for (const k of kandidat) {
    const kAny = k as any;
    const key = kAny.pewawancara_id || '__unassigned__';
    if (!map[key]) {
      map[key] = {
        pewawancara_id: kAny.pewawancara_id,
        pewawancara_nama: kAny.pewawancara_nama || kAny.pewawancara?.user?.nama || 'Belum ditugaskan',
        total: 0, pending: 0, review: 0, diterima: 0, ditolak: 0, sudah_catatan: 0,
      };
    }
    map[key].total++;
    map[key][k.status.toLowerCase()]++;
    if (kAny.catatan_list?.length > 0) map[key].sudah_catatan++;
  }

  const result = Object.values(map).map((r: any) => ({
    ...r,
    status: (r.diterima + r.ditolak) === r.total && r.total > 0 ? 'complete'
      : r.sudah_catatan > 0 ? 'in_progress'
      : 'not_started',
  })).sort((a: any, b: any) => b.total - a.total);
  res.json({ success: true, data: result });
};

export const exportExcel = async (req: any, res: Response): Promise<void> => {
  const XLSX = require('xlsx');
  const { level, status, tahun_ajaran } = req.query;
  const where: any = {};
  if (level) where.level = level;
  if (status) where.status = status;
  if (tahun_ajaran) where.tahun_ajaran = tahun_ajaran;

  const kandidat = await Kandidat.findAll({
    where,
    include: [
      { model: HasilTesAkademik, as: 'hasil_tes', attributes: ['total_skor'] },
      { model: RingkasanAI, as: 'ringkasan_ai', attributes: ['ringkasan'] },
      { model: CatatanPewawancara, as: 'catatan_list' },
    ],
    order: [['created_at', 'DESC']],
  });

  const rows = kandidat.map((k: any) => ({
    'Nama': k.nama,
    'Nama (Diperbaiki)': k.nama_diperbaiki || '',
    'Jenjang': k.level,
    'Status': k.status,
    'Tahun Ajaran': k.tahun_ajaran,
    'Jenis Kelamin': k.jenis_kelamin === 'L' ? 'Laki-laki' : k.jenis_kelamin === 'P' ? 'Perempuan' : '',
    'Asal Sekolah': k.asal_sekolah || '',
    'Nama Ortu': k.nama_ortu || '',
    'No. HP Ortu': k.no_telp_ortu || '',
    'Email Ortu': k.email_ortu || '',
    'Ruangan': k.ruangan || '',
    'Pewawancara': k.pewawancara_nama || '',
    'Skor Akademik': k.hasil_tes?.total_skor ?? '',
    'Jumlah Catatan': k.catatan_list?.length ?? 0,
    'Rekomendasi Terakhir': k.catatan_list?.slice(-1)[0]?.rekomendasi || '',
    'Ringkasan AI': k.ringkasan_ai?.ringkasan || '',
    'Tanggal Daftar': k.created_at ? new Date(k.created_at).toLocaleDateString('id-ID') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kandidat');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="kandidat-${Date.now()}.xlsx"`);
  res.send(buf);
};

export const getQrCode = async (req: any, res: Response): Promise<void> => {
  const QRCode = require('qrcode');
  const k = await Kandidat.findByPk(req.params.id as string, { attributes: ['id', 'nama', 'nama_diperbaiki'] });
  if (!k) { res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan' }); return; }
  const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.smpialfakhir.sch.id'}/tes/${k.id}`;
  const png = await QRCode.toBuffer(url, { type: 'png', width: 300, margin: 2 });
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `inline; filename="qr-${k.id}.png"`);
  res.send(png);
};

export const daftarPublik = async (req: any, res: Response): Promise<void> => {
  const { nama, level, nama_ortu, no_telp_ortu, email_ortu, asal_sekolah, jenis_kelamin, tanggal_lahir } = req.body;
  if (!nama || !level) {
    res.status(400).json({ success: false, message: 'nama dan level wajib diisi' });
    return;
  }
  const tahun_ajaran = getTahunAjaran();
  const duplikat = await Kandidat.findOne({ where: { nama, level, tahun_ajaran } });
  if (duplikat) {
    res.status(409).json({ success: false, message: 'Pendaftaran dengan nama dan jenjang yang sama sudah ada untuk tahun ajaran ini.' });
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
    tahun_ajaran,
    status: 'PENDING',
  });
  res.status(201).json({ success: true, message: 'Pendaftaran berhasil! Tim kami akan menghubungi Anda.', id: kandidat.id });
};

export const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { sendWAMessage } = await import('../utils/waNotification');
  const k = await Kandidat.findByPk(req.params.id as string);
  if (!k) { res.status(404).json({ success: false, message: 'Kandidat tidak ditemukan' }); return; }

  const { status } = req.body;
  if (!['PENDING', 'REVIEW', 'DITERIMA', 'DITOLAK'].includes(status)) {
    res.status(400).json({ success: false, message: 'Status tidak valid' }); return;
  }

  await k.update({ status });

  // Kirim WA notif ke ortu
  if (k.no_telp_ortu && (status === 'DITERIMA' || status === 'DITOLAK')) {
    const nama = k.nama_diperbaiki || k.nama;
    const msg = status === 'DITERIMA'
      ? `Assalamu'alaikum 🎉\n\nSelamat! Kami dengan bangga menyampaikan bahwa *${nama}* telah *DITERIMA* di *Al Fakhir School* Tahun Ajaran ${k.tahun_ajaran}.\n\nSilakan hubungi panitia PPDB untuk informasi selanjutnya.\n\n_Tim PPDB Al Fakhir School_`
      : `Assalamu'alaikum,\n\nTerima kasih atas kepercayaan Anda mendaftarkan *${nama}* ke *Al Fakhir School*.\n\nMohon maaf, setelah melalui proses seleksi, kami belum dapat menerima calon siswa tersebut pada penerimaan kali ini.\n\nSemoga Allah mudahkan jalan terbaik.\n\n_Tim PPDB Al Fakhir School_`;
    sendWAMessage(k.no_telp_ortu, msg).catch(() => {});
  }

  res.json({ success: true, data: k });
};
