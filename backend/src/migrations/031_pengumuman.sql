CREATE TABLE IF NOT EXISTS pengumuman (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul VARCHAR(255) NOT NULL,
  isi TEXT NOT NULL,
  kategori VARCHAR(50) DEFAULT 'Pengumuman',
  target_role VARCHAR(20) DEFAULT 'all',
  school_level VARCHAR(10) DEFAULT 'SD',
  is_active BOOLEAN DEFAULT true,
  tanggal_publish TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
