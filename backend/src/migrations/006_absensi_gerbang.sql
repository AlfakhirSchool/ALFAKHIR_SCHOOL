-- Tabel absensi gerbang sekolah (masuk & pulang)
-- Berbeda dari absensi kelas — ini untuk notifikasi WA ke orang tua
CREATE TABLE IF NOT EXISTS absensi_gerbang (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  siswa_id         UUID        NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  sekolah_id       UUID        REFERENCES sekolah(id),
  tanggal          DATE        NOT NULL DEFAULT CURRENT_DATE,
  waktu_masuk      TIMESTAMP,
  waktu_pulang     TIMESTAMP,
  created_by       UUID        REFERENCES users(id),
  notif_masuk_sent BOOLEAN     DEFAULT FALSE,
  notif_pulang_sent BOOLEAN    DEFAULT FALSE,
  UNIQUE(siswa_id, tanggal)
);

CREATE INDEX IF NOT EXISTS idx_absensi_gerbang_tanggal ON absensi_gerbang(tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_gerbang_siswa ON absensi_gerbang(siswa_id);
