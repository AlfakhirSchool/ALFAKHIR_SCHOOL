import { Router, Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import sequelize from '../config/database';
import redis from '../config/redis';
import { sendWAMessage, buildMasukMessage, buildPulangMessage } from '../utils/waNotification';
import logger from '../config/logger';
import { rateLimiter } from '../middleware/rateLimiter';
import { scanKeys } from '../utils/redisScan';

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const validateDevice = async (device_key: string) => {
  const [device] = await sequelize.query<any>(
    `SELECT id, sekolah_id, nama FROM rfid_devices WHERE device_key = :key AND aktif = TRUE`,
    { replacements: { key: device_key }, type: QueryTypes.SELECT }
  );
  return device || null;
};

const getSiswaByRfid = async (rfid_uid: string) => {
  const cacheKey = `rfid:${rfid_uid}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis miss — proceed to DB
  }

  const [siswa] = await sequelize.query<any>(
    `SELECT s.id AS siswa_id, u.nama AS nama_siswa, u.profile_pic AS foto_url,
            s.nis, k.nama AS nama_kelas, k.sekolah_id,
            sch.nama AS nama_sekolah,
            array_agg(ot.no_telp) FILTER (WHERE ot.no_telp IS NOT NULL) AS ortu_phones
     FROM siswa s
     JOIN users u ON s.user_id = u.id
     JOIN kelas k ON s.kelas_id = k.id
     JOIN sekolah sch ON k.sekolah_id = sch.id
     LEFT JOIN orang_tua ot ON ot.siswa_id = s.id
     WHERE s.rfid_uid = :uid
     GROUP BY s.id, u.nama, u.profile_pic, s.nis, k.nama, k.sekolah_id, sch.nama`,
    { replacements: { uid: rfid_uid }, type: QueryTypes.SELECT }
  );

  if (siswa) {
    redis.setex(cacheKey, 86400, JSON.stringify(siswa)).catch(() => {});
  }
  return siswa || null;
};

// ── POST /rfid/scan — ESP32 tap kartu ────────────────────────────────────────
// Body: { device_key, rfid_uid, mode: 'masuk'|'pulang' }
// Response JSON: { ok, msg, nama?, kelas?, waktu?, foto_url? }
router.post('/scan', rateLimiter(60, 60 * 1000), async (req: Request, res: Response): Promise<void> => {
  const { device_key, rfid_uid, mode, ts, sig } = req.body as {
    device_key: string; rfid_uid: string; mode: string; ts?: number; sig?: string;
  };

  if (!device_key || !rfid_uid || !mode) {
    res.status(400).json({ ok: false, msg: 'device_key, rfid_uid, mode wajib' });
    return;
  }
  if (mode !== 'masuk' && mode !== 'pulang') {
    res.status(400).json({ ok: false, msg: 'mode: masuk atau pulang' });
    return;
  }

  // Optional HMAC signature check — enforced only when RFID_HMAC_SECRET is set
  const hmacSecret = process.env.RFID_HMAC_SECRET;
  if (hmacSecret) {
    if (!ts || !sig) {
      res.status(401).json({ ok: false, msg: 'ts dan sig wajib saat HMAC aktif' });
      return;
    }
    const ageSec = Math.abs(Date.now() / 1000 - ts);
    if (ageSec > 60) {
      res.status(401).json({ ok: false, msg: 'Request kedaluwarsa (replay protection)' });
      return;
    }
    const expected = require('crypto')
      .createHmac('sha256', hmacSecret)
      .update(`${device_key}:${rfid_uid}:${mode}:${ts}`)
      .digest('hex');
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length || !require('crypto').timingSafeEqual(sigBuf, expBuf)) {
      res.status(401).json({ ok: false, msg: 'Signature tidak valid' });
      return;
    }
  }

  const device = await validateDevice(device_key);
  if (!device) {
    res.status(403).json({ ok: false, msg: 'Device tidak dikenali' });
    return;
  }

  // Cek apakah ada admin dalam mode registrasi — jika kartu belum terdaftar, capture untuk registrasi
  const siswa = await getSiswaByRfid(rfid_uid);

  if (!siswa) {
    // Kartu tidak dikenal — cek apakah ada sesi registrasi aktif
    try {
      const regKeys = await scanKeys('rfid_reg:*');
      if (regKeys.length > 0) {
        for (const key of regKeys) {
          const userId = key.replace('rfid_reg:', '');
          await redis.setex(`rfid_capture:${userId}`, 60, rfid_uid);
        }
        res.json({ ok: true, mode: 'register', msg: `Kartu baru: ${rfid_uid}`, rfid_uid });
        return;
      }
    } catch {
      // Redis error, abaikan
    }

    res.status(404).json({ ok: false, msg: 'Kartu belum terdaftar', rfid_uid });
    return;
  }

  // ── Normal attendance ─────────────────────────────────────────────────────
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Cek apakah sudah absen hari ini untuk mode ini
  const [existing] = await sequelize.query<any>(
    mode === 'masuk'
      ? `SELECT waktu_masuk FROM absensi_gerbang WHERE siswa_id = :sid AND tanggal = :today AND waktu_masuk IS NOT NULL`
      : `SELECT waktu_pulang FROM absensi_gerbang WHERE siswa_id = :sid AND tanggal = :today AND waktu_pulang IS NOT NULL`,
    { replacements: { sid: siswa.siswa_id, today }, type: QueryTypes.SELECT }
  );

  if (existing) {
    const waktuLama = mode === 'masuk' ? existing.waktu_masuk : existing.waktu_pulang;
    const jam = new Date(waktuLama).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    res.json({
      ok: true,
      sudah: true,
      msg: `Sudah ${mode} pukul ${jam}`,
      nama: siswa.nama_siswa,
      kelas: siswa.nama_kelas,
      waktu: jam,
      foto_url: siswa.foto_url || null,
    });
    return;
  }

  const insertCol = mode === 'masuk' ? 'waktu_masuk' : 'waktu_pulang';
  const columnSet = mode === 'masuk'
    ? 'waktu_masuk = :now, notif_masuk_sent = FALSE'
    : 'waktu_pulang = :now, notif_pulang_sent = FALSE';

  await sequelize.query(
    `INSERT INTO absensi_gerbang (siswa_id, sekolah_id, tanggal, ${insertCol})
     VALUES (:sid, :skId, :today, :now)
     ON CONFLICT (siswa_id, tanggal)
     DO UPDATE SET ${columnSet}`,
    { replacements: { sid: siswa.siswa_id, skId: siswa.sekolah_id, today, now }, type: QueryTypes.INSERT }
  );

  // Kirim WA async — tidak block response
  const phones: string[] = siswa.ortu_phones || [];
  const waMsg = mode === 'masuk'
    ? buildMasukMessage(siswa.nama_siswa, siswa.nama_sekolah, now)
    : buildPulangMessage(siswa.nama_siswa, siswa.nama_sekolah, now);

  for (const phone of phones) {
    if (phone) {
      sendWAMessage(phone, waMsg).catch((e) =>
        logger.error({ event: 'rfid_wa_error', error: e.message })
      );
    }
  }

  const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  res.json({
    ok: true,
    msg: mode === 'masuk' ? 'HADIR' : 'PULANG',
    nama: siswa.nama_siswa,
    kelas: siswa.nama_kelas,
    nis: siswa.nis,
    waktu: jam,
    foto_url: siswa.foto_url || null,
  });
});

export default router;
