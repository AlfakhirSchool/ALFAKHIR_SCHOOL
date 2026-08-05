-- Migration 028: Tugas (Assignment) dan Pengumpulan Tugas (Submission)

CREATE TABLE IF NOT EXISTS tugas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul           VARCHAR(255)  NOT NULL,
  deskripsi       TEXT,
  kelas_id        UUID          NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  mata_pelajaran_id UUID        REFERENCES mata_pelajaran(id) ON DELETE SET NULL,
  guru_id         UUID          NOT NULL REFERENCES guru(id) ON DELETE CASCADE,
  deadline        TIMESTAMPTZ   NOT NULL,
  file_url        VARCHAR(500),
  file_name       VARCHAR(255),
  max_nilai       INTEGER       NOT NULL DEFAULT 100,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pengumpulan_tugas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tugas_id        UUID          NOT NULL REFERENCES tugas(id) ON DELETE CASCADE,
  siswa_id        UUID          NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  file_url        VARCHAR(500),
  file_name       VARCHAR(255),
  catatan_siswa   TEXT,
  nilai           INTEGER,
  catatan_guru    TEXT,
  dinilai_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (tugas_id, siswa_id)
);

CREATE INDEX IF NOT EXISTS idx_tugas_kelas ON tugas(kelas_id);
CREATE INDEX IF NOT EXISTS idx_tugas_guru ON tugas(guru_id);
CREATE INDEX IF NOT EXISTS idx_pengumpulan_tugas ON pengumpulan_tugas(tugas_id);
CREATE INDEX IF NOT EXISTS idx_pengumpulan_siswa ON pengumpulan_tugas(siswa_id);
