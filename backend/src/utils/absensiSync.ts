import { QueryTypes } from 'sequelize';
import sequelize from '../config/database';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Setelah siswa scan gerbang MASUK, propagate 'hadir' ke semua jadwal hari ini.
 * DO NOTHING on conflict — tidak menimpa izin/sakit yang sudah diset guru.
 */
export async function propagateGerbangToKelas(
  siswa_id: string,
  tanggal: string,
  created_by: string,
): Promise<void> {
  const hari = HARI[new Date(tanggal + 'T00:00:00').getDay()];
  await sequelize.query(
    `INSERT INTO absensi
       (id, siswa_id, jadwal_pelajaran_id, tanggal, status, waktu_hadir, qr_code_scanned, created_by, created_at)
     SELECT gen_random_uuid(), :sid, jp.id, :tgl, 'hadir', NOW(), false, :uid, NOW()
     FROM jadwal_pelajaran jp
     JOIN siswa s ON s.kelas_id = jp.kelas_id
     WHERE s.id = :sid AND jp.hari = :hari
     ON CONFLICT (siswa_id, jadwal_pelajaran_id, tanggal) DO NOTHING`,
    { replacements: { sid: siswa_id, tgl: tanggal, hari, uid: created_by }, type: QueryTypes.INSERT },
  );
}

/**
 * Setelah guru/admin input 'hadir' di kelas, upsert record gerbang (waktu_masuk)
 * jika belum ada — supaya orang tua dapat notif dan rekap gerbang terhitung hadir.
 * DO NOTHING on conflict waktu_masuk — tidak overwrite scan gerbang asli.
 */
export async function propagateKelasToGerbang(
  siswa_ids: string[],
  tanggal: string,
  created_by: string,
): Promise<void> {
  if (!siswa_ids.length) return;
  // Kita butuh sekolah_id per siswa — ambil sekaligus
  const rows = await sequelize.query<{ id: string; sekolah_id: string }>(
    `SELECT s.id, k.sekolah_id
     FROM siswa s JOIN kelas k ON s.kelas_id = k.id
     WHERE s.id = ANY(:ids)`,
    { replacements: { ids: siswa_ids }, type: QueryTypes.SELECT },
  );
  for (const r of rows) {
    await sequelize.query(
      `INSERT INTO absensi_gerbang (siswa_id, sekolah_id, tanggal, waktu_masuk, created_by)
       VALUES (:sid, :skId, :tgl, NOW(), :uid)
       ON CONFLICT (siswa_id, tanggal) DO UPDATE
         SET waktu_masuk = COALESCE(absensi_gerbang.waktu_masuk, EXCLUDED.waktu_masuk)`,
      { replacements: { sid: r.id, skId: r.sekolah_id, tgl: tanggal, uid: created_by }, type: QueryTypes.INSERT },
    );
  }
}

/**
 * Set izin untuk siswa pada tanggal tertentu.
 * - semua_jadwal=true  → upsert 'izin' ke SEMUA jadwal hari itu + update gerbang
 * - semua_jadwal=false → upsert 'izin' ke jadwal_pelajaran_id saja
 */
export async function setIzin(params: {
  siswa_id: string;
  tanggal: string;
  catatan: string | null;
  semua_jadwal: boolean;
  jadwal_pelajaran_id?: string | null;
  created_by: string;
}): Promise<{ jadwal_count: number }> {
  const { siswa_id, tanggal, catatan, semua_jadwal, jadwal_pelajaran_id, created_by } = params;

  if (semua_jadwal) {
    const hari = HARI[new Date(tanggal + 'T00:00:00').getDay()];
    // Upsert izin ke semua jadwal hari itu
    await sequelize.query(
      `INSERT INTO absensi
         (id, siswa_id, jadwal_pelajaran_id, tanggal, status, catatan, qr_code_scanned, created_by, created_at)
       SELECT gen_random_uuid(), :sid, jp.id, :tgl, 'izin', :kat, false, :uid, NOW()
       FROM jadwal_pelajaran jp
       JOIN siswa s ON s.kelas_id = jp.kelas_id
       WHERE s.id = :sid AND jp.hari = :hari
       ON CONFLICT (siswa_id, jadwal_pelajaran_id, tanggal) DO UPDATE
         SET status = 'izin', catatan = EXCLUDED.catatan`,
      { replacements: { sid: siswa_id, tgl: tanggal, hari, kat: catatan || null, uid: created_by }, type: QueryTypes.INSERT },
    );
    // Update gerbang — keterangan_status = 'izin'
    const [siswaRow] = await sequelize.query<{ sekolah_id: string }>(
      `SELECT k.sekolah_id FROM siswa s JOIN kelas k ON s.kelas_id = k.id WHERE s.id = :sid`,
      { replacements: { sid: siswa_id }, type: QueryTypes.SELECT },
    );
    if (siswaRow) {
      await sequelize.query(
        `INSERT INTO absensi_gerbang (siswa_id, sekolah_id, tanggal, keterangan_status, keterangan, keterangan_by, keterangan_at, created_by)
         VALUES (:sid, :skId, :tgl, 'izin', :kat, :uid, NOW(), :uid)
         ON CONFLICT (siswa_id, tanggal) DO UPDATE
           SET keterangan_status = 'izin', keterangan = EXCLUDED.keterangan,
               keterangan_by = EXCLUDED.keterangan_by, keterangan_at = NOW()`,
        { replacements: { sid: siswa_id, skId: siswaRow.sekolah_id, tgl: tanggal, kat: catatan || null, uid: created_by }, type: QueryTypes.INSERT },
      );
    }
    // Hitung jadwal yg terpengaruh
    const [cnt] = await sequelize.query<{ c: string }>(
      `SELECT COUNT(jp.id) AS c FROM jadwal_pelajaran jp JOIN siswa s ON s.kelas_id = jp.kelas_id
       WHERE s.id = :sid AND jp.hari = :hari`,
      { replacements: { sid: siswa_id, hari }, type: QueryTypes.SELECT },
    );
    return { jadwal_count: parseInt(cnt?.c || '0', 10) };
  } else {
    // Satu jadwal saja
    if (!jadwal_pelajaran_id) throw new Error('jadwal_pelajaran_id wajib jika semua_jadwal=false');
    await sequelize.query(
      `INSERT INTO absensi (id, siswa_id, jadwal_pelajaran_id, tanggal, status, catatan, qr_code_scanned, created_by, created_at)
       VALUES (gen_random_uuid(), :sid, :jid, :tgl, 'izin', :kat, false, :uid, NOW())
       ON CONFLICT (siswa_id, jadwal_pelajaran_id, tanggal) DO UPDATE
         SET status = 'izin', catatan = EXCLUDED.catatan`,
      { replacements: { sid: siswa_id, jid: jadwal_pelajaran_id, tgl: tanggal, kat: catatan || null, uid: created_by }, type: QueryTypes.INSERT },
    );
    return { jadwal_count: 1 };
  }
}
