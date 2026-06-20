import { Router, Response } from 'express';
import { QueryTypes } from 'sequelize';
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

export default router;
