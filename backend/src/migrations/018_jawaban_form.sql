CREATE TABLE IF NOT EXISTS jawaban_form (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidat_id UUID NOT NULL REFERENCES kandidat(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('ortu', 'siswa')),
  jawaban JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jawaban_form_unique ON jawaban_form(kandidat_id, role);
