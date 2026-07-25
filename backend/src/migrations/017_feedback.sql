CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  kategori VARCHAR(50) NOT NULL, -- 'pertanyaan' | 'saran' | 'fitur' | 'bug'
  judul VARCHAR(200) NOT NULL,
  pesan TEXT NOT NULL,
  sumber VARCHAR(20) DEFAULT 'web', -- 'web-guru' | 'web-admin' | 'app-siswa' | 'app-ortu'
  status VARCHAR(20) DEFAULT 'baru', -- 'baru' | 'dibaca' | 'dibalas'
  balasan TEXT,
  dibalas_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
