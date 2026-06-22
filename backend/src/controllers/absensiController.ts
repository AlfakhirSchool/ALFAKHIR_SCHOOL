import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { Op, QueryTypes } from 'sequelize';
import { Absensi, QrCodeSession, JadwalPelajaran, Siswa, Kelas, MataPelajaran, Guru, User } from '../models';
import sequelize from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { kelasIdFilter } from '../utils/levelFilter';
import { sendWAMessage, buildMasukMessage, buildPulangMessage } from '../utils/waNotification';
import logger from '../config/logger';

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
    const qr_image = await QRCode.toDataURL(existingSession.qr_data);
    res.json({ success: true, message: 'Session QR masih aktif', data: { ...existingSession.toJSON(), qr_image } });
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

  // Backward compat: QR gerbang dikirim ke endpoint ini oleh APK lama
  if (qr_data && qr_data.startsWith('GATE:')) {
    const parts = qr_data.split(':');
    if (parts.length < 4) { res.status(400).json({ success: false, message: 'QR code gerbang tidak valid' }); return; }
    const gateMode = parts[1];
    const gateDate = parts[2];
    const gateCode = parts[3];
    const today = new Date().toISOString().split('T')[0];
    if (gateDate !== today) { res.status(400).json({ success: false, message: 'QR code sudah kedaluwarsa' }); return; }
    const secret = process.env.GATE_SECRET || 'alfakhir_gate_2025';
    const hash = crypto.createHash('sha256').update(`${today}:${gateMode}:${secret}`).digest('hex');
    const expectedCode = String(parseInt(hash.slice(0, 8), 16) % 1000000).padStart(6, '0');
    if (gateCode !== expectedCode) { res.status(400).json({ success: false, message: 'QR code gerbang tidak valid' }); return; }
    const [siswaRow] = await sequelize.query<any>(
      `SELECT s.id AS siswa_id, u.nama AS nama_siswa, k.sekolah_id, sch.nama AS nama_sekolah,
              array_agg(ot.no_telp) FILTER (WHERE ot.no_telp IS NOT NULL) AS ortu_phones
       FROM siswa s JOIN users u ON s.user_id = u.id JOIN kelas k ON s.kelas_id = k.id
       JOIN sekolah sch ON k.sekolah_id = sch.id LEFT JOIN orang_tua ot ON ot.siswa_id = s.id
       WHERE s.id = :sid GROUP BY s.id, u.nama, k.sekolah_id, sch.nama`,
      { replacements: { sid: siswa_id }, type: QueryTypes.SELECT }
    );
    if (!siswaRow) { res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' }); return; }
    const now = new Date();
    const col = gateMode === 'masuk' ? 'waktu_masuk' : 'waktu_pulang';
    const upd = gateMode === 'masuk' ? 'waktu_masuk = :now, notif_masuk_sent = FALSE' : 'waktu_pulang = :now, notif_pulang_sent = FALSE';
    await sequelize.query(
      `INSERT INTO absensi_gerbang (siswa_id, sekolah_id, tanggal, ${col}, created_by)
       VALUES (:sid, :skId, :today, :now, :uid)
       ON CONFLICT (siswa_id, tanggal) DO UPDATE SET ${upd}`,
      { replacements: { sid: siswa_id, skId: siswaRow.sekolah_id, today, now, uid: req.user!.id }, type: QueryTypes.INSERT }
    );
    const phones: string[] = siswaRow.ortu_phones || [];
    const msg = gateMode === 'masuk'
      ? buildMasukMessage(siswaRow.nama_siswa, siswaRow.nama_sekolah, now)
      : buildPulangMessage(siswaRow.nama_siswa, siswaRow.nama_sekolah, now);
    for (const p of phones) if (p) sendWAMessage(p, msg).catch(e => logger.error({ event: 'wa_gate_compat', error: e.message }));
    res.status(201).json({ success: true, message: `${siswaRow.nama_siswa} berhasil absensi ${gateMode} sekolah!`, data: { nama_siswa: siswaRow.nama_siswa, mode: gateMode, waktu: now } });
    return;
  }

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
  const { code, siswa_id } = req.body as { code: string; siswa_id: string };

  const session = await QrCodeSession.findOne({ where: { unique_code: code, aktif: true } });
  if (!session) {
    res.status(400).json({ success: false, message: 'Kode tidak valid atau session sudah berakhir' });
    return;
  }

  const jadwal_pelajaran_id = session.jadwal_pelajaran_id;
  const tanggal = typeof session.tanggal === 'string' ? session.tanggal : (session.tanggal as Date).toISOString().split('T')[0];

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
  if (jadwal_id) where.jadwal_pelajaran_id = jadwal_id as string;
  if (start_date && end_date) {
    where.tanggal = { [Op.between]: [new Date(start_date as string), new Date(end_date as string)] };
  }

  // Filter siswa berdasarkan level admin
  if (siswa_id) {
    where.siswa_id = siswa_id as string;
  } else if (req.user?.school_level) {
    const levelWhere = await kelasIdFilter(req.user.school_level);
    const siswaList = await Siswa.findAll({ where: levelWhere, attributes: ['id'] });
    where.siswa_id = { [Op.in]: siswaList.map((s: any) => s.id) };
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

export const remove = async (req: AuthRequest, res: Response): Promise<void> => {
  const record = await Absensi.findByPk(req.params.id as string);
  if (!record) throw createError('Data absensi tidak ditemukan', 404);
  await record.destroy();
  res.json({ success: true, message: 'Data absensi berhasil dihapus' });
};

// Guru: ambil daftar siswa di jadwal hari ini, auto-fill status dari gate
export const persiapanGuru = async (req: AuthRequest, res: Response): Promise<void> => {
  const { jadwal_pelajaran_id, tanggal } = req.query as { jadwal_pelajaran_id: string; tanggal?: string };
  if (!jadwal_pelajaran_id) throw createError('jadwal_pelajaran_id wajib diisi', 400);
  const tgl = tanggal || new Date().toISOString().split('T')[0];

  const jadwal = await JadwalPelajaran.findByPk(jadwal_pelajaran_id, {
    include: [
      { model: Kelas, as: 'kelas' },
      { model: MataPelajaran, as: 'mata_pelajaran' },
      { model: Guru, as: 'guru', include: [{ model: User, as: 'user' }] },
    ],
  });
  if (!jadwal) throw createError('Jadwal tidak ditemukan', 404);

  // Ambil semua siswa di kelas + status gate + absensi yg sudah direkam guru
  const rows = await sequelize.query<any>(
    `SELECT
       s.id AS siswa_id, u.nama AS nama_siswa, s.nis,
       COALESCE(ag.keterangan_status,
         CASE WHEN ag.waktu_masuk IS NOT NULL THEN 'hadir' ELSE 'alfa' END
       )          AS status_gate,
       ag.keterangan AS ket_gate,
       ab.id      AS absensi_id,
       ab.status  AS status_guru,
       ab.catatan
     FROM siswa s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN absensi_gerbang ag ON ag.siswa_id = s.id AND ag.tanggal = :tgl
     LEFT JOIN absensi ab ON ab.siswa_id = s.id AND ab.jadwal_pelajaran_id = :jid AND ab.tanggal = :tgl
     WHERE s.kelas_id = :kelas_id
     ORDER BY u.nama`,
    { replacements: { kelas_id: (jadwal as any).kelas_id, jid: jadwal_pelajaran_id, tgl }, type: QueryTypes.SELECT }
  );

  res.json({ success: true, data: rows, jadwal, tanggal: tgl });
};

// Guru: simpan absensi batch per jadwal per hari
export const bulkGuru = async (req: AuthRequest, res: Response): Promise<void> => {
  const { jadwal_pelajaran_id, tanggal, absensi: listAbsensi } = req.body as {
    jadwal_pelajaran_id: string;
    tanggal: string;
    absensi: Array<{ siswa_id: string; status: string; catatan?: string }>;
  };
  if (!jadwal_pelajaran_id || !tanggal || !listAbsensi?.length) throw createError('Data tidak lengkap', 400);

  for (const item of listAbsensi) {
    await Absensi.upsert({
      siswa_id: item.siswa_id,
      jadwal_pelajaran_id,
      tanggal: new Date(tanggal),
      status: item.status as any,
      catatan: item.catatan || null,
      waktu_hadir: item.status === 'hadir' ? new Date() : undefined,
      created_by: req.user!.id,
    } as any);
  }

  // Log ke activity_log
  await sequelize.query(
    `INSERT INTO activity_log (user_id, action, table_name, new_value) VALUES (:uid, 'bulk_absensi_guru', 'absensi', :val::jsonb)`,
    { replacements: { uid: req.user!.id, val: JSON.stringify({ jadwal_pelajaran_id, tanggal, jumlah: listAbsensi.length }) }, type: QueryTypes.INSERT }
  );

  res.json({ success: true, message: `${listAbsensi.length} absensi berhasil disimpan` });
};

// Wali kelas: rekap kelas yang diampu untuk tanggal tertentu
export const rekapWaliKelas = async (req: AuthRequest, res: Response): Promise<void> => {
  const { tanggal } = req.query;
  const tgl = (tanggal as string) || new Date().toISOString().split('T')[0];

  // Cari guru dari user yang login
  const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
  if (!guru) throw createError('Data guru tidak ditemukan', 404);

  // Cari kelas di mana guru ini adalah wali kelas
  const kelas = await Kelas.findOne({ where: { wali_kelas_id: guru.id } });
  if (!kelas) throw createError('Anda tidak terdaftar sebagai wali kelas', 404);

  const rows = await sequelize.query<any>(
    `SELECT
       s.id AS siswa_id, u.nama AS nama_siswa, s.nis,
       COALESCE(ag.keterangan_status,
         CASE WHEN ag.waktu_masuk IS NOT NULL THEN 'hadir' ELSE 'alfa' END
       )              AS status,
       ag.waktu_masuk,
       ag.keterangan,
       ag.lokasi_valid,
       ag.lokasi_jarak_meter
     FROM siswa s
     JOIN users u ON s.user_id = u.id
     LEFT JOIN absensi_gerbang ag ON ag.siswa_id = s.id AND ag.tanggal = :tgl
     WHERE s.kelas_id = :kelas_id
     ORDER BY u.nama`,
    { replacements: { kelas_id: kelas.id, tgl }, type: QueryTypes.SELECT }
  );

  const summary = { hadir: 0, sakit: 0, izin: 0, alfa: 0 };
  rows.forEach((r: any) => { if (r.status in summary) summary[r.status as keyof typeof summary]++; });

  res.json({ success: true, kelas, data: rows, summary, tanggal: tgl });
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
