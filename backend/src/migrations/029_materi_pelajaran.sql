CREATE TABLE IF NOT EXISTS materi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mata_pelajaran_id UUID NOT NULL REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
  kelas_id UUID REFERENCES kelas(id) ON DELETE SET NULL,
  guru_id UUID REFERENCES guru(id) ON DELETE SET NULL,
  judul VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_size INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_materi_mapel ON materi(mata_pelajaran_id);
CREATE INDEX IF NOT EXISTS idx_materi_kelas ON materi(kelas_id);
CREATE INDEX IF NOT EXISTS idx_materi_guru ON materi(guru_id);
