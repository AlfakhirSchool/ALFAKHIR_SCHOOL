-- Migrasi 009: RFID ID Card Attendance
-- Kolom rfid_uid di tabel siswa
ALTER TABLE siswa
  ADD COLUMN IF NOT EXISTS rfid_uid VARCHAR(50) UNIQUE;

-- Tabel device terminal RFID (ESP32)
CREATE TABLE IF NOT EXISTS rfid_devices (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nama        VARCHAR(100) NOT NULL,
  device_key  VARCHAR(100) NOT NULL UNIQUE,
  sekolah_id  UUID        REFERENCES sekolah(id) ON DELETE SET NULL,
  lokasi      VARCHAR(100),
  aktif       BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMP   DEFAULT NOW()
);

-- Index untuk lookup cepat absensi gerbang (penting untuk 1500+ siswa)
CREATE INDEX IF NOT EXISTS idx_siswa_rfid_uid
  ON siswa(rfid_uid) WHERE rfid_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_absensi_gerbang_siswa_tanggal
  ON absensi_gerbang(siswa_id, tanggal);

CREATE INDEX IF NOT EXISTS idx_absensi_gerbang_tanggal_sekolah
  ON absensi_gerbang(tanggal, sekolah_id);

-- Index tambahan untuk rekap kelas (query JOIN besar)
CREATE INDEX IF NOT EXISTS idx_siswa_kelas_id
  ON siswa(kelas_id);
