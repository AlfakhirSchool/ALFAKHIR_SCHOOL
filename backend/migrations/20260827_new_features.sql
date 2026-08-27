-- Migrasi: fitur baru 2026-08-27
-- Jalankan di DB produksi sebelum deploy

-- 1. Tambah kolom ke tugas
ALTER TABLE tugas
  ADD COLUMN IF NOT EXISTS jenis VARCHAR(20) NOT NULL DEFAULT 'tugas'
    CHECK (jenis IN ('tugas', 'proyek', 'ulangan_harian')),
  ADD COLUMN IF NOT EXISTS tgl_diberikan DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. Tabel pelanggaran
CREATE TABLE IF NOT EXISTS pelanggaran (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id           UUID NOT NULL REFERENCES siswa(id),
  guru_id            UUID REFERENCES guru(id),
  jenis_pelanggaran  VARCHAR(255) NOT NULL,
  poin               INTEGER NOT NULL DEFAULT 0,
  keterangan         TEXT,
  tanggal            DATE NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_siswa ON pelanggaran(siswa_id);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_tanggal ON pelanggaran(tanggal);

-- 3. Tabel siswa_berhalangan
CREATE TABLE IF NOT EXISTS siswa_berhalangan (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id    UUID NOT NULL REFERENCES siswa(id),
  tanggal     DATE NOT NULL,
  hari_ke     INTEGER,
  catatan     TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (siswa_id, tanggal)
);
CREATE INDEX IF NOT EXISTS idx_berhalangan_siswa ON siswa_berhalangan(siswa_id);

-- 4. Tabel agenda_piket
CREATE TABLE IF NOT EXISTS agenda_piket (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guru_id           UUID NOT NULL REFERENCES guru(id),
  sekolah_id        UUID REFERENCES sekolah(id),
  tanggal           DATE NOT NULL,
  keadaan_kbm       TEXT,
  siswa_terlambat   JSONB NOT NULL DEFAULT '[]',
  guru_tidak_masuk  JSONB NOT NULL DEFAULT '[]',
  catatan           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agenda_piket_tanggal ON agenda_piket(tanggal);
CREATE INDEX IF NOT EXISTS idx_agenda_piket_guru ON agenda_piket(guru_id);
