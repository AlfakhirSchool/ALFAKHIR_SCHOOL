-- Koordinat GPS sekolah untuk validasi lokasi absensi siswa
ALTER TABLE sekolah
  ADD COLUMN IF NOT EXISTS lat          DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS lng          DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS radius_meter INTEGER DEFAULT 200;

-- Data lokasi GPS saat siswa scan gerbang
ALTER TABLE absensi_gerbang
  ADD COLUMN IF NOT EXISTS lokasi_lat        DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS lokasi_lng        DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS lokasi_valid      BOOLEAN,
  ADD COLUMN IF NOT EXISTS lokasi_jarak_meter INTEGER;
