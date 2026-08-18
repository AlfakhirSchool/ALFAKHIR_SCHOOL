-- Index tambahan untuk query rekap nilai per guru/mapel
CREATE INDEX IF NOT EXISTS idx_nilai_guru ON nilai(guru_id);
CREATE INDEX IF NOT EXISTS idx_nilai_mata_pelajaran ON nilai(mata_pelajaran_id);

-- Unique constraint pada hasil tes akademik per kandidat (cegah race condition double submit)
ALTER TABLE hasil_tes_akademik ADD CONSTRAINT IF NOT EXISTS hasil_tes_akademik_kandidat_unique
  UNIQUE (kandidat_id);
