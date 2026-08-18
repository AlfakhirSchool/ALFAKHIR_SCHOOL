-- Prevent duplicate absensi entries for same siswa + jadwal + tanggal
ALTER TABLE absensi ADD CONSTRAINT IF NOT EXISTS absensi_siswa_jadwal_tanggal_unique
  UNIQUE (siswa_id, jadwal_pelajaran_id, tanggal);
