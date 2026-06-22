-- Keterangan harian untuk absensi gerbang
-- Admin jenjang bisa set status izin/sakit/alfa + keterangan
-- Status efektif = keterangan_status (override admin) ?? hadir (jika ada waktu_masuk) ?? alfa
ALTER TABLE absensi_gerbang
  ADD COLUMN IF NOT EXISTS keterangan_status VARCHAR(10) CHECK (keterangan_status IN ('sakit', 'izin', 'alfa')),
  ADD COLUMN IF NOT EXISTS keterangan        TEXT,
  ADD COLUMN IF NOT EXISTS keterangan_by     UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS keterangan_at     TIMESTAMP;
