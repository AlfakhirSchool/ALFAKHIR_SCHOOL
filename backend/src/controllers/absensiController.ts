import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { Op } from 'sequelize';
import { Absensi, QrCodeSession, JadwalPelajaran, Siswa, Kelas, MataPelajaran, Guru, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const generateUniqueCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createQrSession = async (req: AuthRequest, res: Response): Promise<void> => {
  const { jadwal_pelajaran_id, tanggal } = req.body as { jadwal_pelajaran_id: string; tanggal: string };

  const jadwal = await JadwalPelajaran.findByPk(jadwal_pelajaran_id, {
    include: [
      { model: Guru, as: 'guru', include: [{ model: User, as: 'user' }] },
      { model: Kelas, as: 'kelas' },
      { model: MataPelajaran, as: 'mata_pelajaran' },
    ],
  });
  if (!jadwal) throw createError('Jadwal tidak ditemukan', 404);

  const existingSession = await QrCodeSession.findOne({
    where: { jadwal_pelajaran_id, tanggal, aktif: true },
  });
  if (existingSession) {
    res.json({ success: true, message: 'Session QR masih aktif', data: existingSession });
    return;
  }

  const unique_code = generateUniqueCode();
  const sessionId = uuidv4();
  const qr_data = JSON.stringify({ session_id: sessionId, code: unique_code, jadwal_id: jadwal_pelajaran_id, tanggal });
  const qr_image = await QRCode.toDataURL(qr_data);

  const session = await QrCodeSession.create({
    id: sessionId,
    jadwal_pelajaran_id,
    tanggal: new Date(tanggal),
    unique_code,
    qr_data,
    aktif: true,
    waktu_mulai: new Date(),
  });

  res.status(201).json({
    success: true,
    data: { ...session.toJSON(), qr_image, jadwal },
  });
};

export const closeQrSession = async (req: AuthRequest, res: Response): Promise<void> => {
  const session = await QrCodeSession.findByPk(req.params.id as string);
  if (!session) throw createError('Session tidak ditemukan', 404);

  await session.update({ aktif: false, waktu_selesai: new Date() });
  res.json({ success: true, message: 'Session QR ditutup' });
};

export const scanQr = async (req: AuthRequest, res: Response): Promise<void> => {
  const { qr_data, siswa_id } = req.body as { qr_data: string; siswa_id: string };

  let parsedQr: { session_id: string; code: string; jadwal_id: string; tanggal: string };
  try {
    parsedQr = JSON.parse(qr_data);
  } catch {
    res.status(400).json({ success: false, message: 'QR code tidak valid' });
    return;
  }

  const session = await QrCodeSession.findByPk(parsedQr.session_id as string);
  if (!session || !session.aktif) {
    res.status(400).json({ success: false, message: 'Session QR tidak aktif atau sudah berakhir' });
    return;
  }

  const existing = await Absensi.findOne({
    where: { siswa_id, jadwal_pelajaran_id: parsedQr.jadwal_id, tanggal: parsedQr.tanggal },
  });
  if (existing) {
    res.status(400).json({ success: false, message: 'Absensi sudah tercatat' });
    return;
  }

  const absensi = await Absensi.create({
    siswa_id,
    jadwal_pelajaran_id: parsedQr.jadwal_id,
    tanggal: new Date(parsedQr.tanggal),
    waktu_hadir: new Date(),
    status: 'hadir',
    qr_code_scanned: true,
    created_by: req.user!.id,
  });

  res.status(201).json({ success: true, message: 'Absensi berhasil dicatat', data: absensi });
};

export const inputCode = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, siswa_id, jadwal_pelajaran_id, tanggal } = req.body as {
    code: string; siswa_id: string; jadwal_pelajaran_id: string; tanggal: string;
  };

  const session = await QrCodeSession.findOne({
    where: { jadwal_pelajaran_id, tanggal, aktif: true, unique_code: code },
  });
  if (!session) {
    res.status(400).json({ success: false, message: 'Kode tidak valid atau session sudah berakhir' });
    return;
  }

  const existing = await Absensi.findOne({ where: { siswa_id, jadwal_pelajaran_id, tanggal } });
  if (existing) {
    res.status(400).json({ success: false, message: 'Absensi sudah tercatat' });
    return;
  }

  const absensi = await Absensi.create({
    siswa_id,
    jadwal_pelajaran_id,
    tanggal: new Date(tanggal),
    waktu_hadir: new Date(),
    status: 'hadir',
    qr_code_scanned: false,
    input_code: code,
    created_by: req.user!.id,
  });

  res.status(201).json({ success: true, message: 'Absensi berhasil dicatat', data: absensi });
};

export const manualInput = async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id, jadwal_pelajaran_id, tanggal, status, catatan } = req.body as {
    siswa_id: string; jadwal_pelajaran_id: string; tanggal: string;
    status: 'hadir' | 'sakit' | 'izin' | 'alfa'; catatan?: string;
  };

  const existing = await Absensi.findOne({ where: { siswa_id, jadwal_pelajaran_id, tanggal } });
  if (existing) {
    await existing.update({ status, catatan, created_by: req.user!.id });
    res.json({ success: true, message: 'Absensi berhasil diperbarui', data: existing });
    return;
  }

  const absensi = await Absensi.create({
    siswa_id,
    jadwal_pelajaran_id,
    tanggal: new Date(tanggal),
    status,
    catatan,
    created_by: req.user!.id,
  });

  res.status(201).json({ success: true, message: 'Absensi berhasil dicatat', data: absensi });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const absensi = await Absensi.findByPk(req.params.id as string);
  if (!absensi) throw createError('Absensi tidak ditemukan', 404);

  await absensi.update({ status: req.body.status, catatan: req.body.catatan });
  res.json({ success: true, message: 'Absensi berhasil diperbarui', data: absensi });
};

export const getLaporan = async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id, jadwal_id, start_date, end_date } = req.query;

  const where: Record<string, unknown> = {};
  if (siswa_id) where.siswa_id = siswa_id as string;
  if (jadwal_id) where.jadwal_pelajaran_id = jadwal_id as string;
  if (start_date && end_date) {
    where.tanggal = { [Op.between]: [new Date(start_date as string), new Date(end_date as string)] };
  }

  const absensiList = await Absensi.findAll({
    where,
    include: [
      { model: Siswa, as: 'siswa', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
      { model: JadwalPelajaran, as: 'jadwal', include: [{ model: MataPelajaran, as: 'mata_pelajaran' }] },
    ],
    order: [['tanggal', 'DESC']],
  });

  const summary = {
    hadir: absensiList.filter(a => a.status === 'hadir').length,
    sakit: absensiList.filter(a => a.status === 'sakit').length,
    izin: absensiList.filter(a => a.status === 'izin').length,
    alfa: absensiList.filter(a => a.status === 'alfa').length,
    total: absensiList.length,
  };

  res.json({ success: true, data: absensiList, summary });
};

export const getSiswaDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  const { bulan, tahun } = req.query;
  const where: Record<string, unknown> = { siswa_id: req.params.siswa_id as string };

  if (bulan && tahun) {
    const startDate = new Date(parseInt(tahun as string), parseInt(bulan as string) - 1, 1);
    const endDate = new Date(parseInt(tahun as string), parseInt(bulan as string), 0);
    where.tanggal = { [Op.between]: [startDate, endDate] };
  }

  const absensiList = await Absensi.findAll({
    where,
    include: [{ model: JadwalPelajaran, as: 'jadwal', include: [{ model: MataPelajaran, as: 'mata_pelajaran' }] }],
    order: [['tanggal', 'DESC']],
  });

  res.json({ success: true, data: absensiList });
};
