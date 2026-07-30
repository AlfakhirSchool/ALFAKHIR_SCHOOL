CREATE TABLE IF NOT EXISTS pertanyaan_form (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teks TEXT NOT NULL,
  tipe VARCHAR(20) NOT NULL DEFAULT 'text',
  role VARCHAR(10) NOT NULL DEFAULT 'ortu',
  level VARCHAR(10),
  urutan INTEGER DEFAULT 0,
  options TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO pertanyaan_form (teks, tipe, role, level, urutan, options, is_system) VALUES
('Apa alasan utama Bapak/Ibu memilih sekolah ini untuk putra/putri Anda?', 'long_text', 'ortu', NULL, 1, NULL, true),
('Apa harapan terbesar Bapak/Ibu terhadap pendidikan putra/putri di sekolah ini?', 'long_text', 'ortu', NULL, 2, NULL, true),
('Bagaimana karakter anak di rumah sehari-hari?', 'long_text', 'ortu', NULL, 3, NULL, true),
('Seberapa aktif Bapak/Ibu berencana terlibat dalam kegiatan sekolah?', 'choice', 'ortu', NULL, 4, '["Sangat aktif","Cukup aktif","Tergantung waktu","Kurang bisa terlibat"]', true),
('Apakah ada kondisi kesehatan atau kebutuhan khusus yang perlu diketahui sekolah?', 'long_text', 'ortu', NULL, 5, NULL, true),
('Dari mana Bapak/Ibu mengetahui sekolah ini?', 'choice', 'ortu', NULL, 6, '["Rekomendasi teman/keluarga","Media sosial","Website sekolah","Brosur/spanduk","Lainnya"]', true),
('Seberapa baik kesan Bapak/Ibu terhadap proses pendaftaran ini?', 'rating', 'ortu', NULL, 7, NULL, true),
('Kenapa kamu ingin bersekolah di sini?', 'long_text', 'siswa', NULL, 1, NULL, true),
('Apa hobi atau kegiatan yang paling kamu sukai?', 'text', 'siswa', NULL, 2, NULL, true),
('Mata pelajaran apa yang paling kamu sukai di sekolah sebelumnya?', 'text', 'siswa', NULL, 3, NULL, true),
('Apa cita-cita atau impianmu ke depan?', 'text', 'siswa', NULL, 4, NULL, true),
('Apakah kamu pernah aktif di organisasi atau kegiatan ekstra? Ceritakan!', 'long_text', 'siswa', NULL, 5, NULL, true),
('Apakah ada hal yang kamu khawatirkan tentang bersekolah di sini?', 'long_text', 'siswa', NULL, 6, NULL, true),
('Seberapa semangat kamu mengikuti proses observasi ini?', 'rating', 'siswa', NULL, 7, NULL, true)
ON CONFLICT DO NOTHING;
