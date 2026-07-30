-- Extend tabel kandidat dengan kolom baru
ALTER TABLE kandidat
  ADD COLUMN IF NOT EXISTS nama_diperbaiki VARCHAR(150),
  ADD COLUMN IF NOT EXISTS email_siswa VARCHAR(150),
  ADD COLUMN IF NOT EXISTS ruangan VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pewawancara_nama VARCHAR(150);

-- Tabel catatan pewawancara
CREATE TABLE IF NOT EXISTS catatan_pewawancara (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidat_id UUID NOT NULL REFERENCES kandidat(id) ON DELETE CASCADE,
  pewawancara_email VARCHAR(150),
  pewawancara_nama VARCHAR(150),
  observasi TEXT,
  penilaian_akademik TEXT,
  dukungan_keluarga TEXT,
  catatan_karakter TEXT,
  catatan_lain TEXT,
  rekomendasi VARCHAR(50),
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabel soal akademik
CREATE TABLE IF NOT EXISTS soal_akademik (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teks TEXT NOT NULL,
  mata_pelajaran VARCHAR(100) NOT NULL,
  gambar_url TEXT,
  pilihan TEXT NOT NULL,
  jawaban_benar TEXT NOT NULL,
  urutan INTEGER NOT NULL DEFAULT 0,
  level enum_kandidat_level,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabel hasil tes akademik
CREATE TABLE IF NOT EXISTS hasil_tes_akademik (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidat_id UUID NOT NULL UNIQUE REFERENCES kandidat(id) ON DELETE CASCADE,
  total_skor FLOAT NOT NULL,
  skor_per_mapel TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabel jawaban akademik
CREATE TABLE IF NOT EXISTS jawaban_akademik (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidat_id UUID NOT NULL REFERENCES kandidat(id) ON DELETE CASCADE,
  soal_id UUID NOT NULL REFERENCES soal_akademik(id) ON DELETE CASCADE,
  jawaban TEXT NOT NULL,
  benar BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(kandidat_id, soal_id)
);

-- Tabel ringkasan AI
CREATE TABLE IF NOT EXISTS ringkasan_ai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidat_id UUID NOT NULL UNIQUE REFERENCES kandidat(id) ON DELETE CASCADE,
  ringkasan TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
