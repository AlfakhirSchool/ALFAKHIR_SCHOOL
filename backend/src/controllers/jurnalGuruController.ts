import { Response } from 'express';
import { Op } from 'sequelize';
import * as XLSX from 'xlsx';
import { JurnalGuru, JurnalSiswa, Guru, Kelas, MataPelajaran, User, Siswa } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { kelasIdFilter } from '../utils/levelFilter';

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  let guru = await Guru.findOne({ where: { user_id: req.user!.id } });
  if (!guru) {
    if (req.user!.role === 'admin') {
      guru = await Guru.create({ user_id: req.user!.id, school_levels: [] });
    } else {
      throw createError('Data guru tidak ditemukan', 404);
    }
  }

  // Cegah duplikat jurnal untuk guru+kelas+mapel+tanggal yang sama
  if (req.body.kelas_id && req.body.mata_pelajaran_id && req.body.tanggal) {
    const existing = await JurnalGuru.findOne({
      where: { guru_id: (guru as any).id, kelas_id: req.body.kelas_id, mata_pelajaran_id: req.body.mata_pelajaran_id, tanggal: req.body.tanggal },
    });
    if (existing) {
      res.status(409).json({ success: false, message: 'Jurnal untuk kelas, mata pelajaran, dan tanggal ini sudah ada', data: existing });
      return;
    }
  }

  const jurnal = await JurnalGuru.create({ ...req.body, guru_id: (guru as any).id, status: 'draft' });
  res.status(201).json({ success: true, message: 'Jurnal berhasil dibuat', data: jurnal });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const jurnal = await JurnalGuru.findByPk(req.params.id as string);
  if (!jurnal) throw createError('Jurnal tidak ditemukan', 404);

  const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
  if (req.user!.role !== 'admin' && jurnal.guru_id !== guru?.id) {
    throw createError('Tidak berhak mengubah jurnal ini', 403);
  }

  if (jurnal.status === 'approved') {
    throw createError('Jurnal yang sudah disetujui tidak bisa diubah', 400);
  }

  await jurnal.update({ ...req.body, status: 'draft' });
  res.json({ success: true, message: 'Jurnal berhasil diperbarui', data: jurnal });
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  const jurnal = await JurnalGuru.findByPk(req.params.id as string, {
    include: [
      { model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
      { model: Kelas, as: 'kelas' },
      { model: MataPelajaran, as: 'mata_pelajaran' },
    ],
  });
  if (!jurnal) throw createError('Jurnal tidak ditemukan', 404);
  res.json({ success: true, data: jurnal });
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const { kelas_id, guru_id, status, start_date, end_date, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const levelWhere = await kelasIdFilter(req.user?.school_level);
  const where: Record<string, unknown> = { ...levelWhere };
  if (kelas_id) where.kelas_id = kelas_id;
  if (status) where.status = status;
  if (start_date && end_date) {
    where.tanggal = { [Op.between]: [new Date(start_date as string), new Date(end_date as string)] };
  }

  if (req.user!.role === 'guru') {
    const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
    if (guru) where.guru_id = guru.id;
  } else if (guru_id) {
    where.guru_id = guru_id;
  }

  const { count, rows } = await JurnalGuru.findAndCountAll({
    where,
    include: [
      { model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
      { model: Kelas, as: 'kelas' },
      { model: MataPelajaran, as: 'mata_pelajaran' },
    ],
    limit: parseInt(limit as string),
    offset,
    order: [['tanggal', 'DESC']],
  });

  res.json({
    success: true,
    data: rows,
    pagination: { total: count, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(count / parseInt(limit as string)) },
  });
};

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const jurnal = await JurnalGuru.findByPk(req.params.id as string);
  if (!jurnal) throw createError('Jurnal tidak ditemukan', 404);
  await jurnal.destroy();
  res.json({ success: true, message: 'Jurnal berhasil dihapus' });
};

export const submit = async (req: AuthRequest, res: Response): Promise<void> => {
  const jurnal = await JurnalGuru.findByPk(req.params.id as string);
  if (!jurnal) throw createError('Jurnal tidak ditemukan', 404);
  if (jurnal.status !== 'draft') throw createError('Hanya jurnal draft yang bisa disubmit', 400);

  const ttd_guru = req.body?.ttd_guru || null;
  await jurnal.update({ status: 'submitted', ttd_guru, signed_at: ttd_guru ? new Date() : null }, { validate: false });
  res.json({ success: true, message: 'Jurnal berhasil disubmit untuk review', data: jurnal });
};

export const review = async (req: AuthRequest, res: Response): Promise<void> => {
  const jurnal = await JurnalGuru.findByPk(req.params.id as string);
  if (!jurnal) throw createError('Jurnal tidak ditemukan', 404);

  const { action, ttd_wali_kelas, catatan } = req.body;

  if (action === 'approve') {
    await jurnal.update({
      status: 'approved',
      ttd_wali_kelas,
      wali_kelas_signed_at: new Date(),
    });
    res.json({ success: true, message: 'Jurnal disetujui', data: jurnal });
  } else if (action === 'reject') {
    await jurnal.update({ status: 'draft' });
    res.json({ success: true, message: 'Jurnal dikembalikan ke draft', data: jurnal });
  } else {
    res.status(400).json({ success: false, message: 'Action tidak valid (approve/reject)' });
  }
};

export const getLaporanKelas = async (req: AuthRequest, res: Response): Promise<void> => {
  const jurnalList = await JurnalGuru.findAll({
    where: { kelas_id: req.params.id },
    include: [
      { model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
      { model: MataPelajaran, as: 'mata_pelajaran' },
    ],
    order: [['tanggal', 'DESC']],
  });

  const summary = {
    total: jurnalList.length,
    draft: jurnalList.filter(j => j.status === 'draft').length,
    submitted: jurnalList.filter(j => j.status === 'submitted').length,
    approved: jurnalList.filter(j => j.status === 'approved').length,
  };

  res.json({ success: true, data: jurnalList, summary });
};

export const exportPdf = async (req: AuthRequest, res: Response): Promise<void> => {
  const jurnal = await JurnalGuru.findByPk(req.params.id as string, {
    include: [
      { model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
      { model: Kelas, as: 'kelas' },
      { model: MataPelajaran, as: 'mata_pelajaran' },
    ],
  });
  if (!jurnal) throw createError('Jurnal tidak ditemukan', 404);

  res.json({ success: true, message: 'Export PDF jurnal - coming soon', data: jurnal });
};

export const downloadExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  const { kelas_id, status, guru_id, start_date, end_date } = req.query;

  const levelWhere = await kelasIdFilter(req.user?.school_level);
  const where: any = {};
  if (status) where.status = status;
  if (start_date) where.tanggal = { [Op.gte]: start_date };
  if (start_date && end_date) where.tanggal = { [Op.between]: [start_date, end_date] };

  const kelasWhere: any = { ...levelWhere };
  if (kelas_id) kelasWhere.id = kelas_id;

  const list = await JurnalGuru.findAll({
    where,
    include: [
      { model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
      { model: Kelas, as: 'kelas', where: Object.keys(kelasWhere).length ? kelasWhere : undefined, required: !!kelas_id },
      { model: MataPelajaran, as: 'mata_pelajaran' },
    ],
    order: [['tanggal', 'DESC']],
  });

  const rows = list.map((j: any) => ({
    'Tanggal': j.tanggal ? new Date(j.tanggal).toLocaleDateString('id-ID') : '',
    'Guru': j.guru?.user?.nama || '',
    'Kelas': j.kelas?.nama || '',
    'Mata Pelajaran': j.mata_pelajaran?.nama || '',
    'Topik': j.topik_pelajaran || '',
    'Tugas': j.deskripsi_pembelajaran || '',
    'Catatan Guru': j.hasil_pembelajaran || '',
    'Rencana Tindak Lanjut': j.rencana_tindak_lanjut || '',
    'Status': j.status || '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [10, 20, 15, 20, 30, 40, 40, 30, 12].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Jurnal Guru');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename="JurnalGuru_${new Date().toISOString().split('T')[0]}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
};

export const getRiwayatSiswa = async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id } = req.params;
  const { kelas_id } = req.query;

  const where: any = { siswa_id };
  const jurnalWhere: any = {};
  if (kelas_id) jurnalWhere.kelas_id = kelas_id;

  // Guru hanya bisa lihat riwayat dari jurnal miliknya sendiri
  if (req.user?.role === 'guru') {
    const guru = await Guru.findOne({ where: { user_id: req.user.id } });
    if (guru) jurnalWhere.guru_id = guru.id;
  }

  const detail = await JurnalSiswa.findAll({
    where,
    include: [{
      model: JurnalGuru, as: 'jurnal',
      where: Object.keys(jurnalWhere).length ? jurnalWhere : undefined,
      include: [
        { model: Kelas, as: 'kelas' },
        { model: MataPelajaran, as: 'mata_pelajaran' },
        { model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
      ],
    }],
    order: [[{ model: JurnalGuru, as: 'jurnal' }, 'tanggal', 'DESC']],
  });

  const total = detail.length;
  const stats = { hadir: 0, sakit: 0, izin: 0, alfa: 0 };
  detail.forEach(d => { if (stats[d.kehadiran as keyof typeof stats] !== undefined) stats[d.kehadiran as keyof typeof stats]++; });

  res.json({ success: true, data: detail, stats, total });
};

export const getSiswaDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  const jurnal = await JurnalGuru.findByPk(req.params.id as string);
  if (!jurnal) throw createError('Jurnal tidak ditemukan', 404);

  const detail = await JurnalSiswa.findAll({
    where: { jurnal_id: jurnal.id },
    include: [{ model: Siswa, as: 'siswa', include: [{ model: User, as: 'user', attributes: ['nama'] }] }],
  });
  res.json({ success: true, data: detail });
};

export const saveSiswaDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  const jurnal = await JurnalGuru.findByPk(req.params.id as string);
  if (!jurnal) throw createError('Jurnal tidak ditemukan', 404);

  const items: { siswa_id: string; kehadiran: string; catatan?: string; foto_url?: string }[] = req.body.items || [];

  // Upsert per siswa
  for (const item of items) {
    await JurnalSiswa.upsert({
      jurnal_id: jurnal.id,
      siswa_id: item.siswa_id,
      kehadiran: (item.kehadiran as any) || 'hadir',
      catatan: item.catatan || null,
      ...(item.foto_url !== undefined ? { foto_url: item.foto_url } : {}),
    });
  }

  // Update aggregate counts di jurnal
  const hadir = items.filter(i => i.kehadiran === 'hadir').length;
  const sakit = items.filter(i => i.kehadiran === 'sakit').length;
  const izin  = items.filter(i => i.kehadiran === 'izin').length;
  const alfa  = items.filter(i => i.kehadiran === 'alfa').length;
  await jurnal.update({ jumlah_siswa_hadir: hadir, jumlah_siswa_sakit: sakit, jumlah_siswa_izin: izin, jumlah_siswa_alfa: alfa });

  res.json({ success: true, message: 'Detail siswa berhasil disimpan' });
};
