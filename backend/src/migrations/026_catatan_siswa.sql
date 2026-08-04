CREATE TABLE IF NOT EXISTS catatan_siswa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  guru_id UUID NOT NULL REFERENCES guru(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  judul VARCHAR(255),
  isi TEXT NOT NULL,
  foto_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catatan_siswa_siswa ON catatan_siswa(siswa_id);
CREATE INDEX IF NOT EXISTS idx_catatan_siswa_guru ON catatan_siswa(guru_id);
