import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { Op, QueryTypes } from 'sequelize';
import { Absensi, QrCodeSession, JadwalPelajaran, Siswa, Kelas, MataPelajaran, Guru, User, Sekolah } from '../models';
import sequelize from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { scanKeys } from '../utils/redisScan';
import redis from '../config/redis';
import { kelasIdFilter } from '../utils/levelFilter';
import { sendWAMessage, buildMasukMessage, buildPulangMessage } from '../utils/waNotification';
import { propagateKelasToGerbang, setIzin } from '../utils/absensiSync';
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
  const { qr_data, siswa_id, latitude, longitude } = req.body as { qr_data: string; siswa_id: string; latitude?: number; longitude?: number };

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
    if (gateMode === 'masuk') {
      const { propagateGerbangToKelas } = await import('../utils/absensiSync');
      propagateGerbangToKelas(siswa_id, today, req.user!.id).catch(e =>
        logger.error({ event: 'propagate_gate_compat_error', error: e.message })
      );
    }
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

  let absensi;
  try {
    absensi = await Absensi.create({
      siswa_id,
      jadwal_pelajaran_id: parsedQr.jadwal_id,
      tanggal: new Date(parsedQr.tanggal),
      waktu_hadir: new Date(),
      status: 'hadir',
      qr_code_scanned: true,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      created_by: req.user!.id,
    });
  } catch (e: any) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ success: false, message: 'Absensi sudah tercatat' });
      return;
    }
    throw e;
  }

  scanKeys(`absensi:detail:${siswa_id}:*`).then(keys => { if (keys.length) redis.del(...keys); }).catch(() => {});
  res.status(201).json({ success: true, message: 'Absensi berhasil dicatat', data: absensi });
};

export const inputCode = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, siswa_id, latitude, longitude } = req.body as { code: string; siswa_id: string; latitude?: number; longitude?: number };

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

  let absensi;
  try {
    absensi = await Absensi.create({
      siswa_id,
      jadwal_pelajaran_id,
      tanggal: new Date(tanggal),
      waktu_hadir: new Date(),
      status: 'hadir',
      qr_code_scanned: false,
      input_code: code,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      created_by: req.user!.id,
    });
  } catch (e: any) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ success: false, message: 'Absensi sudah tercatat' });
      return;
    }
    throw e;
  }

  scanKeys(`absensi:detail:${siswa_id}:*`).then(keys => { if (keys.length) redis.del(...keys); }).catch(() => {});
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
    scanKeys(`absensi:detail:${siswa_id}:*`).then(keys => { if (keys.length) redis.del(...keys); }).catch(() => {});
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

  scanKeys(`absensi:detail:${siswa_id}:*`).then(keys => { if (keys.length) redis.del(...keys); }).catch(() => {});
  res.status(201).json({ success: true, message: 'Absensi berhasil dicatat', data: absensi });
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  const absensi = await Absensi.findByPk(req.params.id as string);
  if (!absensi) throw createError('Absensi tidak ditemukan', 404);

  await absensi.update({ status: req.body.status, catatan: req.body.catatan });
  scanKeys(`absensi:detail:${(absensi as any).siswa_id}:*`).then(keys => { if (keys.length) redis.del(...keys); }).catch(() => {});
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
    await sequelize.query(
      `INSERT INTO absensi (id, siswa_id, jadwal_pelajaran_id, tanggal, status, catatan, waktu_hadir, qr_code_scanned, created_by, created_at)
       VALUES (gen_random_uuid(), :siswa_id, :jid, :tgl, :status, :catatan, :waktu, false, :uid, NOW())
       ON CONFLICT (siswa_id, jadwal_pelajaran_id, tanggal) DO UPDATE SET
         status = EXCLUDED.status, catatan = EXCLUDED.catatan, waktu_hadir = EXCLUDED.waktu_hadir`,
      { replacements: { siswa_id: item.siswa_id, jid: jadwal_pelajaran_id, tgl: tanggal, status: item.status, catatan: item.catatan || null, waktu: item.status === 'hadir' ? new Date() : null, uid: req.user!.id }, type: QueryTypes.INSERT }
    );
  }

  // Propagate siswa yang hadir ke absensi_gerbang (waktu_masuk) jika belum ada
  const hadirIds = listAbsensi.filter(i => i.status === 'hadir').map(i => i.siswa_id);
  if (hadirIds.length) {
    propagateKelasToGerbang(hadirIds, tanggal, req.user!.id).catch(e =>
      logger.error({ event: 'propagate_kelas_to_gerbang_error', error: e.message })
    );
  }

  try {
    await sequelize.query(
      `INSERT INTO activity_log (user_id, action, table_name, new_value) VALUES (:uid, 'bulk_absensi_guru', 'absensi', :val::jsonb)`,
      { replacements: { uid: req.user!.id, val: JSON.stringify({ jadwal_pelajaran_id, tanggal, jumlah: listAbsensi.length }) }, type: QueryTypes.INSERT }
    );
  } catch (err) { logger.error({ event: 'activity_log_error', error: err }); }

  res.json({ success: true, message: `${listAbsensi.length} absensi berhasil disimpan` });
};

// Guru/Admin: set izin untuk satu siswa — bisa ke semua jadwal hari itu atau satu jadwal saja
export const izinBulk = async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id, tanggal, catatan, semua_jadwal, jadwal_pelajaran_id } = req.body as {
    siswa_id: string;
    tanggal: string;
    catatan?: string;
    semua_jadwal: boolean;
    jadwal_pelajaran_id?: string;
  };

  if (!siswa_id || !tanggal || semua_jadwal === undefined) {
    throw createError('siswa_id, tanggal, dan semua_jadwal wajib diisi', 400);
  }
  if (!semua_jadwal && !jadwal_pelajaran_id) {
    throw createError('jadwal_pelajaran_id wajib jika semua_jadwal=false', 400);
  }

  const result = await setIzin({
    siswa_id,
    tanggal,
    catatan: catatan || null,
    semua_jadwal,
    jadwal_pelajaran_id: jadwal_pelajaran_id || null,
    created_by: req.user!.id,
  });

  const msg = semua_jadwal
    ? `Izin dicatat untuk ${result.jadwal_count} jadwal pelajaran`
    : 'Izin dicatat untuk 1 jadwal pelajaran';

  res.json({ success: true, message: msg, data: result });
};

// Admin: bulk absensi seluruh kelas → propagate ke semua jadwal hari itu
export const bulkKelas = async (req: AuthRequest, res: Response): Promise<void> => {
  const { kelas_id, tanggal, absensi: listAbsensi } = req.body as {
    kelas_id: string;
    tanggal: string;
    absensi: Array<{ siswa_id: string; status: string; catatan?: string }>;
  };
  if (!kelas_id || !tanggal || !listAbsensi?.length) throw createError('Data tidak lengkap', 400);

  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const hariIni = HARI[new Date(tanggal).getDay()];

  const jadwalList = await JadwalPelajaran.findAll({ where: { kelas_id, hari: hariIni } });
  if (!jadwalList.length) throw createError(`Tidak ada jadwal untuk hari ${hariIni}`, 400);

  let count = 0;
  for (const jadwal of jadwalList) {
    for (const item of listAbsensi) {
      await sequelize.query(
        `INSERT INTO absensi (id, siswa_id, jadwal_pelajaran_id, tanggal, status, catatan, waktu_hadir, qr_code_scanned, created_by, created_at)
         VALUES (gen_random_uuid(), :siswa_id, :jid, :tgl, :status, :catatan, :waktu, false, :uid, NOW())
         ON CONFLICT (siswa_id, jadwal_pelajaran_id, tanggal) DO UPDATE SET
           status = EXCLUDED.status, catatan = EXCLUDED.catatan, waktu_hadir = EXCLUDED.waktu_hadir`,
        { replacements: { siswa_id: item.siswa_id, jid: (jadwal as any).id, tgl: tanggal, status: item.status, catatan: item.catatan || null, waktu: item.status === 'hadir' ? new Date() : null, uid: req.user!.id }, type: QueryTypes.INSERT }
      );
      count++;
    }
  }

  res.json({ success: true, message: `${listAbsensi.length} siswa × ${jadwalList.length} jadwal = ${count} absensi disimpan` });
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

export const downloadRekap = async (req: AuthRequest, res: Response): Promise<void> => {
  const { kelas_id, bulan, tahun } = req.query;
  const b = parseInt(bulan as string) || new Date().getMonth() + 1;
  const y = parseInt(tahun as string) || new Date().getFullYear();

  const kelas = await Kelas.findByPk(kelas_id as string, { include: [{ model: Sekolah, as: 'sekolah' }] });
  if (!kelas) throw createError('Kelas tidak ditemukan', 404);

  const startDate = new Date(y, b - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(y, b, 0).toISOString().split('T')[0];
  const daysInMonth = new Date(y, b, 0).getDate();
  const namaBulan = new Date(y, b - 1, 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
  const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const siswaList = await sequelize.query<any>(
    `SELECT s.id, u.nama, s.nis FROM siswa s JOIN users u ON s.user_id = u.id WHERE s.kelas_id = :kelas_id ORDER BY u.nama`,
    { replacements: { kelas_id }, type: QueryTypes.SELECT }
  );

  const mapelList = await sequelize.query<any>(
    `SELECT DISTINCT mp.id, mp.nama FROM mata_pelajaran mp
     JOIN jadwal_pelajaran jp ON jp.mata_pelajaran_id = mp.id
     WHERE jp.kelas_id = :kelas_id ORDER BY mp.nama`,
    { replacements: { kelas_id }, type: QueryTypes.SELECT }
  );

  const rows = await sequelize.query<any>(
    `SELECT a.siswa_id, mp.id AS mapel_id,
            EXTRACT(DAY FROM a.tanggal::date)::int AS tgl, a.status
     FROM absensi a
     JOIN jadwal_pelajaran jp ON a.jadwal_pelajaran_id = jp.id
     JOIN mata_pelajaran mp ON jp.mata_pelajaran_id = mp.id
     WHERE jp.kelas_id = :kelas_id AND a.tanggal BETWEEN :start AND :end`,
    { replacements: { kelas_id, start: startDate, end: endDate }, type: QueryTypes.SELECT }
  );

  // byMapel[mapel_id][siswa_id][tgl] = status
  const byMapel: Record<string, Record<string, Record<number, string>>> = {};
  for (const r of rows) {
    if (!byMapel[r.mapel_id]) byMapel[r.mapel_id] = {};
    if (!byMapel[r.mapel_id][r.siswa_id]) byMapel[r.mapel_id][r.siswa_id] = {};
    byMapel[r.mapel_id][r.siswa_id][r.tgl] = r.status;
  }

  const namaSekolah = (kelas as any).sekolah?.nama || 'Al Fakhir School';
  const wb = XLSX.utils.book_new();
  const totalCols = 3 + daysInMonth + 4;

  const buildSheet = (mapelNama: string, dayMap: Record<string, Record<number, string>>) => {
    const titleRow = [`STUDENT ATTENDANCE LIST - ${namaSekolah} - ${kelas.nama} - ${mapelNama} - ${namaBulan}`];
    const headerRow: any[] = ['No', 'STUDENT NAME', 'M/F'];
    for (let d = 1; d <= daysInMonth; d++) headerRow.push(d);
    headerRow.push('H', 'S', 'I', 'A');

    const dayRow: any[] = ['', 'DAY →', ''];
    for (let d = 1; d <= daysInMonth; d++) dayRow.push(DAY_NAMES[new Date(y, b - 1, d).getDay()]);
    dayRow.push('', 'SUMMARY', '', '');

    const dataRows: any[][] = [titleRow, headerRow, dayRow];
    const totalPerDay: Record<number, number> = {};
    let no = 1, totH = 0, totS = 0, totI = 0, totA = 0;

    for (const s of siswaList) {
      const sdays = dayMap[s.id] || {};
      const row: any[] = [no++, s.nama, '-'];
      let H = 0, S = 0, I = 0, A = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(y, b - 1, d).getDay();
        if (dow === 0) { row.push('—'); continue; }
        const st = sdays[d];
        if (!st) { row.push(''); }
        else if (st === 'hadir') { row.push('H'); H++; totalPerDay[d] = (totalPerDay[d] || 0) + 1; }
        else if (st === 'sakit') { row.push('S'); S++; }
        else if (st === 'izin') { row.push('I'); I++; }
        else { row.push('A'); A++; }
      }
      row.push(H, S, I, A);
      totH += H; totS += S; totI += I; totA += A;
      dataRows.push(row);
    }

    const totalRow: any[] = ['', 'TOTAL PRESENT', ''];
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(y, b - 1, d).getDay();
      totalRow.push(dow === 0 ? '—' : (totalPerDay[d] || 0));
    }
    totalRow.push(totH, totS, totI, totA);
    dataRows.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet(dataRows);
    ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 5 }, ...Array(daysInMonth).fill({ wch: 4 }), { wch: 5 }, { wch: 5 }, { wch: 5 }, { wch: 5 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }];
    return ws;
  };

  if (mapelList.length === 0) {
    // Fallback: single sheet no mapel data
    const ws = buildSheet('SEMUA', {});
    XLSX.utils.book_append_sheet(wb, ws, `Rekap ${namaBulan}`);
  } else {
    for (const mp of mapelList) {
      const ws = buildSheet(mp.nama, byMapel[mp.id] || {});
      const sheetName = mp.nama.substring(0, 31); // Excel max 31 chars
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `Absensi_${kelas.nama.replace(/\s+/g, '_')}_${namaBulan.replace(/\s+/g, '_')}.xlsx`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
};

export const getSiswaDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user!.role === 'siswa') {
    const siswa = await Siswa.findOne({ where: { user_id: req.user!.id } });
    if (!siswa || (siswa as any).id !== req.params.siswa_id) throw createError('Akses ditolak', 403);
  }

  const { bulan, tahun } = req.query;
  const siswaId = req.params.siswa_id as string;

  // Cache 2 menit — absensi siswa tidak berubah detik-detik, cukup segar untuk portal
  const cacheKey = `absensi:detail:${siswaId}:${bulan || 'all'}:${tahun || 'all'}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) { res.json(JSON.parse(cached)); return; }

  const where: Record<string, unknown> = { siswa_id: siswaId };

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

  const result = { success: true, data: absensiList };
  redis.setex(cacheKey, 120, JSON.stringify(result)).catch(() => {});
  res.json(result);
};

// JSON data untuk preview rekap absensi per mata pelajaran
export const rekapData = async (req: AuthRequest, res: Response): Promise<void> => {
  const { kelas_id, bulan, tahun } = req.query;
  const b = parseInt(bulan as string) || new Date().getMonth() + 1;
  const y = parseInt(tahun as string) || new Date().getFullYear();

  const kelas = await Kelas.findByPk(kelas_id as string, { include: [{ model: Sekolah, as: 'sekolah' }] });
  if (!kelas) throw createError('Kelas tidak ditemukan', 404);

  const startDate = new Date(y, b - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(y, b, 0).toISOString().split('T')[0];
  const daysInMonth = new Date(y, b, 0).getDate();

  // Ambil semua siswa di kelas
  const siswaList = await sequelize.query<any>(
    `SELECT s.id, u.nama, s.nis FROM siswa s JOIN users u ON s.user_id = u.id WHERE s.kelas_id = :kelas_id ORDER BY u.nama`,
    { replacements: { kelas_id }, type: QueryTypes.SELECT }
  );

  // Ambil semua mata pelajaran yang punya jadwal di kelas ini
  const mapelList = await sequelize.query<any>(
    `SELECT DISTINCT mp.id, mp.nama FROM mata_pelajaran mp
     JOIN jadwal_pelajaran jp ON jp.mata_pelajaran_id = mp.id
     WHERE jp.kelas_id = :kelas_id ORDER BY mp.nama`,
    { replacements: { kelas_id }, type: QueryTypes.SELECT }
  );

  // Ambil semua absensi kelas bulan ini per mapel
  const rows = await sequelize.query<any>(
    `SELECT a.siswa_id, mp.id AS mapel_id, mp.nama AS mapel_nama,
            EXTRACT(DAY FROM a.tanggal::date)::int AS tgl, a.status
     FROM absensi a
     JOIN jadwal_pelajaran jp ON a.jadwal_pelajaran_id = jp.id
     JOIN mata_pelajaran mp ON jp.mata_pelajaran_id = mp.id
     WHERE jp.kelas_id = :kelas_id AND a.tanggal BETWEEN :start AND :end`,
    { replacements: { kelas_id, start: startDate, end: endDate }, type: QueryTypes.SELECT }
  );

  // Bangun struktur: mapel → siswa → { tgl: status }
  const byMapel: Record<string, Record<string, Record<number, string>>> = {};
  for (const r of rows) {
    if (!byMapel[r.mapel_id]) byMapel[r.mapel_id] = {};
    if (!byMapel[r.mapel_id][r.siswa_id]) byMapel[r.mapel_id][r.siswa_id] = {};
    byMapel[r.mapel_id][r.siswa_id][r.tgl] = r.status;
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dow = new Date(y, b - 1, d).getDay();
    return { tgl: d, hari: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dow], libur: dow === 0 };
  });

  const mapelData = mapelList.map(mp => ({
    id: mp.id,
    nama: mp.nama,
    siswa: siswaList.map(s => {
      const dayMap = byMapel[mp.id]?.[s.id] || {};
      let H = 0, S = 0, I = 0, A = 0;
      const absensi: Record<number, string> = {};
      for (const day of days) {
        if (!day.libur) {
          const st = dayMap[day.tgl];
          absensi[day.tgl] = st || '';
          if (st === 'hadir') H++;
          else if (st === 'sakit') S++;
          else if (st === 'izin') I++;
          else if (st === 'alfa') A++;
        }
      }
      return { id: s.id, nama: s.nama, nis: s.nis, absensi, H, S, I, A };
    }),
  }));

  res.json({
    success: true,
    data: {
      kelas: kelas.nama,
      namaSekolah: (kelas as any).sekolah?.nama || 'Al Fakhir School',
      bulan: b,
      tahun: y,
      namaBulan: new Date(y, b - 1, 1).toLocaleString('id-ID', { month: 'long' }),
      days,
      mapel: mapelData,
    },
  });
};
