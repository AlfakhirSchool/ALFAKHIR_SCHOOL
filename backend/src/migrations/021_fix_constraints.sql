-- Fix 1: Unique constraint di tabel pembayaran (cegah tagihan duplikat)
ALTER TABLE pembayaran
  ADD CONSTRAINT IF NOT EXISTS pembayaran_siswa_tahun_jenis_unique
  UNIQUE (siswa_id, tahun_ajaran, jenis_biaya);

-- Fix 2: Unique constraint di pembayaran_detail (idempotency webhook/reference)
ALTER TABLE pembayaran_detail
  ADD CONSTRAINT IF NOT EXISTS pembayaran_detail_reference_unique
  UNIQUE (reference_number)
  DEFERRABLE INITIALLY DEFERRED;

-- Fix 3: nisn di tabel siswa boleh NULL (observasi/daftarkan isi belakangan)
ALTER TABLE siswa ALTER COLUMN nisn DROP NOT NULL;
ALTER TABLE siswa ALTER COLUMN nis DROP NOT NULL;
