-- Index untuk JOIN absensi_gerbang → kelas → sekolah
CREATE INDEX IF NOT EXISTS idx_kelas_sekolah ON kelas(sekolah_id);

-- Index siswa rfid_uid untuk lookup RFID scan
CREATE INDEX IF NOT EXISTS idx_siswa_rfid ON siswa(rfid_uid) WHERE rfid_uid IS NOT NULL;
