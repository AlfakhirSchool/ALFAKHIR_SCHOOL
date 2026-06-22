import { Router, Response } from 'express';
import { QueryTypes } from 'sequelize';
import crypto from 'crypto';
import sequelize from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { sendWAMessage, buildMasukMessage, buildPulangMessage } from '../utils/waNotification';
import logger from '../config/logger';

const router = Router();
router.use(authenticate);

// Daftar absensi gerbang hari ini
router.get('/hari-ini', async (req: AuthRequest, res: Response): Promise<void> => {
  const { sekolah_id } = req.query;
  const today = new Date().toISOString().split('T')[0];

  let sekolahFilter = '';
  if (sekolah_id) {
    sekolahFilter = `AND ag.sekolah_id = '${sekolah_id}'`;
  }

  const rows = await sequelize.query(
    `SELECT ag.*, u.nama AS nama_siswa, s.nisn, s.nis,
            k.nama AS nama_kelas, sch.nama AS nama_sekolah, sch.level AS jenjang
     FROM absensi_gerbang ag
     JOIN siswa s ON ag.siswa_id = s.id
     JOIN users u ON s.user_id = u.id
     JOIN kelas k ON s.kelas_id = k.id
     JOIN sekolah sch ON ag.sekolah_id = sch.id
     WHERE ag.tanggal = :today ${sekolahFilter}
     ORDER BY COALESCE(ag.waktu_masuk, ag.waktu_pulang) DESC`,
    { replacements: { today }, type: QueryTypes.SELECT }
  );

  res.json({ success: true, data: rows });
});

// Catat masuk sekolah
router.post('/masuk', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id } = req.body;
  if (!siswa_id) { res.status(400).json({ success: false, message: 'siswa_id wajib diisi' }); return; }

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Cari data siswa + sekolah + orang tua
  const [siswaRow] = await sequelize.query<any>(
    `SELECT s.id AS siswa_id, u.nama AS nama_siswa,
            k.sekolah_id, sch.nama AS nama_sekolah,
            array_agg(ot.no_telp) FILTER (WHERE ot.no_telp IS NOT NULL) AS ortu_phones
     FROM siswa s
     JOIN users u ON s.user_id = u.id
     JOIN kelas k ON s.kelas_id = k.id
     JOIN sekolah sch ON k.sekolah_id = sch.id
     LEFT JOIN orang_tua ot ON ot.siswa_id = s.id
     WHERE s.id = :sid
     GROUP BY s.id, u.nama, k.sekolah_id, sch.nama`,
    { replacements: { sid: siswa_id }, type: QueryTypes.SELECT }
  );

  if (!siswaRow) { res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' }); return; }

  // Upsert: buat record baru atau update waktu_masuk
  await sequelize.query(
    `INSERT INTO absensi_gerbang (siswa_id, sekolah_id, tanggal, waktu_masuk, created_by)
     VALUES (:sid, :skolahId, :today, :now, :uid)
     ON CONFLICT (siswa_id, tanggal)
     DO UPDATE SET waktu_masuk = :now, notif_masuk_sent = FALSE`,
    { replacements: { sid: siswa_id, skolahId: siswaRow.sekolah_id, today, now, uid: req.user!.id }, type: QueryTypes.INSERT }
  );

  // Kirim notif WA ke semua orang tua
  const phones: string[] = siswaRow.ortu_phones || [];
  const message = buildMasukMessage(siswaRow.nama_siswa, siswaRow.nama_sekolah, now);

  let notifSent = 0;
  for (const phone of phones) {
    if (phone) {
      sendWAMessage(phone, message).catch((e) => logger.error({ event: 'wa_masuk_error', error: e.message }));
      notifSent++;
    }
  }

  await sequelize.query(
    `UPDATE absensi_gerbang SET notif_masuk_sent = TRUE
     WHERE siswa_id = :sid AND tanggal = :today`,
    { replacements: { sid: siswa_id, today }, type: QueryTypes.UPDATE }
  );

  res.json({
    success: true,
    message: `${siswaRow.nama_siswa} tercatat MASUK. ${notifSent > 0 ? `Notifikasi WA dikirim ke ${notifSent} orang tua.` : 'Tidak ada nomor HP orang tua terdaftar.'}`,
    data: { nama_siswa: siswaRow.nama_siswa, waktu: now, notif_sent: notifSent },
  });
});

// Catat pulang sekolah
router.post('/pulang', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id } = req.body;
  if (!siswa_id) { res.status(400).json({ success: false, message: 'siswa_id wajib diisi' }); return; }

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const [siswaRow] = await sequelize.query<any>(
    `SELECT s.id AS siswa_id, u.nama AS nama_siswa,
            k.sekolah_id, sch.nama AS nama_sekolah,
            array_agg(ot.no_telp) FILTER (WHERE ot.no_telp IS NOT NULL) AS ortu_phones
     FROM siswa s
     JOIN users u ON s.user_id = u.id
     JOIN kelas k ON s.kelas_id = k.id
     JOIN sekolah sch ON k.sekolah_id = sch.id
     LEFT JOIN orang_tua ot ON ot.siswa_id = s.id
     WHERE s.id = :sid
     GROUP BY s.id, u.nama, k.sekolah_id, sch.nama`,
    { replacements: { sid: siswa_id }, type: QueryTypes.SELECT }
  );

  if (!siswaRow) { res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' }); return; }

  await sequelize.query(
    `INSERT INTO absensi_gerbang (siswa_id, sekolah_id, tanggal, waktu_pulang, created_by)
     VALUES (:sid, :skolahId, :today, :now, :uid)
     ON CONFLICT (siswa_id, tanggal)
     DO UPDATE SET waktu_pulang = :now, notif_pulang_sent = FALSE`,
    { replacements: { sid: siswa_id, skolahId: siswaRow.sekolah_id, today, now, uid: req.user!.id }, type: QueryTypes.INSERT }
  );

  const phones: string[] = siswaRow.ortu_phones || [];
  const message = buildPulangMessage(siswaRow.nama_siswa, siswaRow.nama_sekolah, now);

  let notifSent = 0;
  for (const phone of phones) {
    if (phone) {
      sendWAMessage(phone, message).catch((e) => logger.error({ event: 'wa_pulang_error', error: e.message }));
      notifSent++;
    }
  }

  await sequelize.query(
    `UPDATE absensi_gerbang SET notif_pulang_sent = TRUE
     WHERE siswa_id = :sid AND tanggal = :today`,
    { replacements: { sid: siswa_id, today }, type: QueryTypes.UPDATE }
  );

  res.json({
    success: true,
    message: `${siswaRow.nama_siswa} tercatat PULANG. ${notifSent > 0 ? `Notifikasi WA dikirim ke ${notifSent} orang tua.` : 'Tidak ada nomor HP orang tua terdaftar.'}`,
    data: { nama_siswa: siswaRow.nama_siswa, waktu: now, notif_sent: notifSent },
  });
});

// Lookup siswa by ID or NISN/NIS (untuk QR scan dan input kode)
router.get('/siswa-by-code', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { code } = req.query;
  if (!code) { res.status(400).json({ success: false, message: 'code wajib diisi' }); return; }

  const rows = await sequelize.query<any>(
    `SELECT s.id, u.nama, s.nisn, s.nis, k.nama AS nama_kelas, sch.nama AS nama_sekolah, sch.level
     FROM siswa s
     JOIN users u ON s.user_id = u.id
     JOIN kelas k ON s.kelas_id = k.id
     JOIN sekolah sch ON k.sekolah_id = sch.id
     WHERE s.id = :code OR s.nisn = :code OR s.nis = :code
     LIMIT 1`,
    { replacements: { code: String(code) }, type: QueryTypes.SELECT }
  );

  if (rows.length === 0) { res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' }); return; }
  res.json({ success: true, data: rows[0] });
});

// Cari siswa untuk autocomplete
router.get('/cari-siswa', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { q, sekolah_id } = req.query;
  if (!q || String(q).length < 2) { res.json({ success: true, data: [] }); return; }

  let skolahFilter = '';
  if (sekolah_id) skolahFilter = `AND k.sekolah_id = '${sekolah_id}'`;

  const rows = await sequelize.query<any>(
    `SELECT s.id, u.nama, s.nisn, s.nis, k.nama AS nama_kelas, sch.nama AS nama_sekolah, sch.level
     FROM siswa s
     JOIN users u ON s.user_id = u.id
     JOIN kelas k ON s.kelas_id = k.id
     JOIN sekolah sch ON k.sekolah_id = sch.id
     WHERE u.nama ILIKE :q ${skolahFilter}
     ORDER BY u.nama
     LIMIT 15`,
    { replacements: { q: `%${q}%` }, type: QueryTypes.SELECT }
  );

  res.json({ success: true, data: rows });
});

// Generate token harian untuk QR gerbang
const getGateToken = (mode: string, date: string) => {
  const secret = process.env.GATE_SECRET || 'alfakhir_gate_2025';
  const hash = crypto.createHash('sha256').update(`${date}:${mode}:${secret}`).digest('hex');
  const code = String(parseInt(hash.slice(0, 8), 16) % 1000000).padStart(6, '0');
  const qr_data = `GATE:${mode}:${date}:${code}`;
  return { code, qr_data };
};

// Admin: ambil token QR harian untuk ditampilkan ke siswa
router.get('/daily-token', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const today = new Date().toISOString().split('T')[0];
  const masuk = getGateToken('masuk', today);
  const pulang = getGateToken('pulang', today);
  res.json({
    success: true,
    data: {
      tanggal: today,
      masuk: { qr_data: masuk.qr_data, code: masuk.code },
      pulang: { qr_data: pulang.qr_data, code: pulang.code },
    },
  });
});

// Siswa: scan QR gerbang atau input kode gerbang
router.post('/scan', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id, qr_data, code, mode: modeParam } = req.body as {
    siswa_id: string; qr_data?: string; code?: string; mode?: string;
  };
  if (!siswa_id) { res.status(400).json({ success: false, message: 'siswa_id wajib diisi' }); return; }

  const today = new Date().toISOString().split('T')[0];
  let mode: string;

  if (qr_data) {
    // Format: GATE:{mode}:{date}:{code}
    const parts = qr_data.split(':');
    if (parts[0] !== 'GATE' || parts.length < 4) {
      res.status(400).json({ success: false, message: 'QR code tidak valid' });
      return;
    }
    mode = parts[1];
    const date = parts[2];
    const tokenCode = parts[3];

    if (date !== today) {
      res.status(400).json({ success: false, message: 'QR code sudah kedaluwarsa' });
      return;
    }
    const expected = getGateToken(mode, today);
    if (tokenCode !== expected.code) {
      res.status(400).json({ success: false, message: 'QR code tidak valid' });
      return;
    }
  } else if (code && modeParam) {
    mode = modeParam;
    const expected = getGateToken(mode, today);
    if (code !== expected.code) {
      res.status(400).json({ success: false, message: 'Kode tidak valid' });
      return;
    }
  } else {
    res.status(400).json({ success: false, message: 'qr_data atau code+mode wajib diisi' });
    return;
  }

  if (mode !== 'masuk' && mode !== 'pulang') {
    res.status(400).json({ success: false, message: 'Mode tidak valid' });
    return;
  }

  // Cari data siswa + sekolah + orang tua
  const [siswaRow] = await sequelize.query<any>(
    `SELECT s.id AS siswa_id, u.nama AS nama_siswa,
            k.sekolah_id, sch.nama AS nama_sekolah,
            array_agg(ot.no_telp) FILTER (WHERE ot.no_telp IS NOT NULL) AS ortu_phones
     FROM siswa s
     JOIN users u ON s.user_id = u.id
     JOIN kelas k ON s.kelas_id = k.id
     JOIN sekolah sch ON k.sekolah_id = sch.id
     LEFT JOIN orang_tua ot ON ot.siswa_id = s.id
     WHERE s.id = :sid
     GROUP BY s.id, u.nama, k.sekolah_id, sch.nama`,
    { replacements: { sid: siswa_id }, type: QueryTypes.SELECT }
  );

  if (!siswaRow) { res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' }); return; }

  const now = new Date();
  const columnSet = mode === 'masuk'
    ? 'waktu_masuk = :now, notif_masuk_sent = FALSE'
    : 'waktu_pulang = :now, notif_pulang_sent = FALSE';
  const insertCol = mode === 'masuk' ? 'waktu_masuk' : 'waktu_pulang';

  await sequelize.query(
    `INSERT INTO absensi_gerbang (siswa_id, sekolah_id, tanggal, ${insertCol}, created_by)
     VALUES (:sid, :skolahId, :today, :now, :uid)
     ON CONFLICT (siswa_id, tanggal)
     DO UPDATE SET ${columnSet}`,
    { replacements: { sid: siswa_id, skolahId: siswaRow.sekolah_id, today, now, uid: req.user!.id }, type: QueryTypes.INSERT }
  );

  // Kirim notif WA
  const phones: string[] = siswaRow.ortu_phones || [];
  const message = mode === 'masuk'
    ? buildMasukMessage(siswaRow.nama_siswa, siswaRow.nama_sekolah, now)
    : buildPulangMessage(siswaRow.nama_siswa, siswaRow.nama_sekolah, now);

  for (const phone of phones) {
    if (phone) {
      sendWAMessage(phone, message).catch((e) => logger.error({ event: 'wa_gate_scan_error', error: e.message }));
    }
  }

  res.json({
    success: true,
    message: `${siswaRow.nama_siswa} berhasil absensi ${mode} sekolah!`,
    data: { nama_siswa: siswaRow.nama_siswa, mode, waktu: now },
  });
});

export default router;
