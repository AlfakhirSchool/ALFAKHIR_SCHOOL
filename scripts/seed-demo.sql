-- Al Fakhir School LMS - Demo Seed Data
-- Jalankan: docker exec -i alfakhir_postgres psql -U alfakhir alfakhir_school < scripts/seed-demo.sql
-- Password default semua user: Admin@1234 (bcrypt hash di bawah)

BEGIN;

-- Sekolah
INSERT INTO sekolah (id, nama, alamat, telepon, email, npsn, kepala_sekolah, created_at, updated_at) VALUES
  ('sch-001', 'SD Islam Al Fakhir', 'Jl. Pendidikan No. 1, Kota', '021-1234567', 'sd@alfakhirschool.id', '20101001', 'Drs. Ahmad Fakhri, M.Pd', NOW(), NOW()),
  ('sch-002', 'SMP Islam Al Fakhir', 'Jl. Pendidikan No. 2, Kota', '021-1234568', 'smp@alfakhirschool.id', '20101002', 'Drs. Hasan Basri, M.Pd', NOW(), NOW()),
  ('sch-003', 'SMA Islam Al Fakhir', 'Jl. Pendidikan No. 3, Kota', '021-1234569', 'sma@alfakhirschool.id', '20101003', 'Dr. Fahmi Rizal, M.Pd', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Users (password hash = bcrypt('Admin@1234', 12))
INSERT INTO users (id, email, password_hash, nama, role, is_active, created_at, updated_at) VALUES
  ('usr-admin-01', 'admin@alfakhirschool.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgni1GWR7HUvuGVWQ3a5Vu', 'Administrator', 'admin', true, NOW(), NOW()),
  ('usr-guru-01', 'guru1@alfakhirschool.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgni1GWR7HUvuGVWQ3a5Vu', 'Bpk. Rizki Kurniawan, S.Pd', 'guru', true, NOW(), NOW()),
  ('usr-guru-02', 'guru2@alfakhirschool.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgni1GWR7HUvuGVWQ3a5Vu', 'Ibu Sari Dewi, S.Pd', 'guru', true, NOW(), NOW()),
  ('usr-siswa-01', 'siswa1@alfakhirschool.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgni1GWR7HUvuGVWQ3a5Vu', 'Ahmad Rizky Pratama', 'siswa', true, NOW(), NOW()),
  ('usr-siswa-02', 'siswa2@alfakhirschool.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgni1GWR7HUvuGVWQ3a5Vu', 'Siti Nurhaliza', 'siswa', true, NOW(), NOW()),
  ('usr-ortu-01', 'ortu1@alfakhirschool.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgni1GWR7HUvuGVWQ3a5Vu', 'Bpk. Pratama (Ayah Ahmad)', 'ortu', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Kelas
INSERT INTO kelas (id, nama, jenjang, tingkat, sekolah_id, tahun_ajaran, is_active, created_at, updated_at) VALUES
  ('kls-001', 'X IPA 1', 'SMA', 10, 'sch-003', '2025/2026', true, NOW(), NOW()),
  ('kls-002', 'X IPA 2', 'SMA', 10, 'sch-003', '2025/2026', true, NOW(), NOW()),
  ('kls-003', 'VII A', 'SMP', 7, 'sch-002', '2025/2026', true, NOW(), NOW()),
  ('kls-004', 'IV A', 'SD', 4, 'sch-001', '2025/2026', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Guru
INSERT INTO guru (id, user_id, nip, spesialisasi, no_telp, alamat, tanggal_lahir, jenis_kelamin, is_active, created_at, updated_at) VALUES
  ('gru-001', 'usr-guru-01', '198501012010011001', 'Matematika', '0812-1111-2222', 'Jl. Guru No. 1', '1985-01-01', 'L', true, NOW(), NOW()),
  ('gru-002', 'usr-guru-02', '198701022010012002', 'Bahasa Indonesia', '0813-2222-3333', 'Jl. Guru No. 2', '1987-02-01', 'P', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE kelas SET wali_kelas_id = 'gru-001' WHERE id = 'kls-001';
UPDATE kelas SET wali_kelas_id = 'gru-002' WHERE id = 'kls-002';

-- Mata Pelajaran
INSERT INTO mata_pelajaran (id, nama, kode, jenjang, kkm, sks, created_at, updated_at) VALUES
  ('mpj-001', 'Matematika', 'MTK', 'SMA', 75, 4, NOW(), NOW()),
  ('mpj-002', 'Bahasa Indonesia', 'BIND', 'SMA', 75, 4, NOW(), NOW()),
  ('mpj-003', 'Fisika', 'FIS', 'SMA', 70, 4, NOW(), NOW()),
  ('mpj-004', 'PAI', 'PAI', 'SMA', 75, 2, NOW(), NOW()),
  ('mpj-005', 'Matematika', 'MTK', 'SMP', 72, 4, NOW(), NOW()),
  ('mpj-006', 'IPA', 'IPA', 'SMP', 70, 4, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Siswa
INSERT INTO siswa (id, user_id, nisn, nis, no_induk, kelas_id, tanggal_lahir, alamat, created_at, updated_at) VALUES
  ('siswa-001', 'usr-siswa-01', '0012345001', 'SMA-001', '001', 'kls-001', '2007-03-15', 'Jl. Siswa No. 1', NOW(), NOW()),
  ('siswa-002', 'usr-siswa-02', '0012345002', 'SMA-002', '002', 'kls-001', '2007-07-20', 'Jl. Siswa No. 2', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Orang Tua
INSERT INTO orang_tua (id, user_id, siswa_id, hubungan, no_telp, pekerjaan, created_at, updated_at) VALUES
  ('ortu-001', 'usr-ortu-01', 'siswa-001', 'ayah', '0811-9999-0000', 'Wiraswasta', NOW(), NOW()),
  ('ortu-002', NULL, 'siswa-002', 'ibu', '0811-8888-0000', 'Guru', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Jadwal Pelajaran
INSERT INTO jadwal_pelajaran (id, kelas_id, mata_pelajaran_id, guru_id, hari, jam_mulai, jam_selesai, ruangan, created_at, updated_at) VALUES
  ('jdw-001', 'kls-001', 'mpj-001', 'gru-001', 'Senin', '07:00', '08:30', 'Ruang A1', NOW(), NOW()),
  ('jdw-002', 'kls-001', 'mpj-002', 'gru-002', 'Senin', '08:30', '10:00', 'Ruang A1', NOW(), NOW()),
  ('jdw-003', 'kls-001', 'mpj-001', 'gru-001', 'Rabu', '07:00', '08:30', 'Ruang A1', NOW(), NOW()),
  ('jdw-004', 'kls-001', 'mpj-003', 'gru-001', 'Kamis', '09:00', '10:30', 'Lab IPA', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Pembayaran sample
INSERT INTO pembayaran (id, siswa_id, jenis_pembayaran, nominal, bulan, tahun, status, kode_va, tanggal_jatuh_tempo, created_at, updated_at) VALUES
  ('pay-001', 'siswa-001', 'SPP', 500000, 6, 2025, 'lunas', 'BCA2501001', '2025-06-10', NOW(), NOW()),
  ('pay-002', 'siswa-001', 'SPP', 500000, 7, 2025, 'belum', 'BCA2501002', '2025-07-10', NOW(), NOW()),
  ('pay-003', 'siswa-002', 'SPP', 500000, 6, 2025, 'belum', 'BCA2502001', '2025-06-10', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Nilai sample (nilai_akhir = kuis*10% + tugas*15% + uts*25% + uas*50%)
-- Ahmad: 80*0.1 + 85*0.15 + 78*0.25 + 82*0.5 = 8+12.75+19.5+41 = 81.25 ≈ 81
INSERT INTO nilai (id, siswa_id, mata_pelajaran_id, guru_id, semester, tahun_ajaran, kuis, tugas, uts, uas, nilai_akhir, grade, predikat, input_date) VALUES
  ('nil-001', 'siswa-001', 'mpj-001', 'gru-001', 1, '2025/2026', 80, 85, 78, 82, 81, 'B', 'Baik', NOW()),
  ('nil-002', 'siswa-001', 'mpj-002', 'gru-002', 1, '2025/2026', 90, 88, 85, 87, 87, 'A', 'Sangat Baik', NOW()),
  ('nil-003', 'siswa-002', 'mpj-001', 'gru-001', 1, '2025/2026', 75, 78, 70, 73, 73, 'C', 'Cukup', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;

SELECT 'Seed data berhasil diinsert!' as status;
SELECT 'Login: admin@alfakhirschool.id / Admin@1234' as info;
SELECT 'Login: guru1@alfakhirschool.id / Admin@1234' as guru;
SELECT 'Login: siswa1@alfakhirschool.id / Admin@1234' as siswa;
