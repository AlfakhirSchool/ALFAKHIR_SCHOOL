import { Response } from 'express';
import { Op } from 'sequelize';
import { JurnalGuru, Guru, Kelas, MataPelajaran, User } from '../models';
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

  const jurnal = await JurnalGuru.create({ ...req.body, guru_id: guru.id, status: 'draft' });
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

  const ttd_guru = req.body.ttd_guru || null;
  await jurnal.update({ status: 'submitted', ttd_guru, signed_at: ttd_guru ? new Date() : null });
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

  // PDF generation akan di-implement dengan jsPDF atau pdfkit
  res.json({ success: true, message: 'Export PDF jurnal - coming soon', data: jurnal });
};
