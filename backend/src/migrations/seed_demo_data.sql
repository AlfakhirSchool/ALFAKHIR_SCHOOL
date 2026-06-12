-- Al Fakhir School LMS - Demo Seed Data
-- Run AFTER 001_init_schema.sql

DO $$
DECLARE
    sma_id UUID;
    smp_id UUID;
    sd_id UUID;
    guru1_user_id UUID := uuid_generate_v4();
    guru1_id UUID := uuid_generate_v4();
    guru2_user_id UUID := uuid_generate_v4();
    guru2_id UUID := uuid_generate_v4();
    kelas_10a_id UUID := uuid_generate_v4();
    kelas_7a_id UUID := uuid_generate_v4();
    siswa1_user_id UUID := uuid_generate_v4();
    siswa1_id UUID := uuid_generate_v4();
    mapel1_id UUID := uuid_generate_v4();
    mapel2_id UUID := uuid_generate_v4();
BEGIN
    -- Get school IDs
    SELECT id INTO sma_id FROM sekolah WHERE level = 'SMA';
    SELECT id INTO smp_id FROM sekolah WHERE level = 'SMP';
    SELECT id INTO sd_id FROM sekolah WHERE level = 'SD';

    -- Insert demo guru users
    INSERT INTO users (id, email, password_hash, nama, role) VALUES
        (guru1_user_id, 'budi.santoso@alfakhirschool.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFBkaYXbvBvbqxO', 'Budi Santoso, S.Pd', 'guru'),
        (guru2_user_id, 'siti.rahma@alfakhirschool.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFBkaYXbvBvbqxO', 'Siti Rahma, M.Pd', 'guru');

    -- Insert guru detail
    INSERT INTO guru (id, user_id, nip, spesialisasi, no_telp) VALUES
        (guru1_id, guru1_user_id, '197801012010011001', 'Matematika', '08123456789'),
        (guru2_id, guru2_user_id, '198502152012012002', 'Bahasa Indonesia', '08234567890');

    -- Insert kelas
    INSERT INTO kelas (id, sekolah_id, nama, tingkat, wali_kelas_id, tahun_ajaran) VALUES
        (kelas_10a_id, sma_id, 'X-A', 10, guru1_id, '2024-2025'),
        (kelas_7a_id, smp_id, 'VII-A', 7, guru2_id, '2024-2025');

    -- Insert mata pelajaran
    INSERT INTO mata_pelajaran (id, nama, kode, kkm) VALUES
        (mapel1_id, 'Matematika', 'MTK', 75),
        (mapel2_id, 'Bahasa Indonesia', 'BIN', 75);

    -- Insert demo siswa
    INSERT INTO users (id, email, password_hash, nama, role) VALUES
        (siswa1_user_id, 'ahmad.fauzi@siswa.alfakhirschool.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFBkaYXbvBvbqxO', 'Ahmad Fauzi', 'siswa');

    INSERT INTO siswa (id, user_id, kelas_id, nisn, nis, no_induk, tempat_lahir, tanggal_lahir) VALUES
        (siswa1_id, siswa1_user_id, kelas_10a_id, '0098765432', 'SMA001', '2024001', 'Jakarta', '2008-05-15');

    -- Insert jadwal
    INSERT INTO jadwal_pelajaran (kelas_id, guru_id, mata_pelajaran_id, hari, jam_mulai, jam_selesai, ruangan) VALUES
        (kelas_10a_id, guru1_id, mapel1_id, 'Senin', '07:30', '09:00', 'R-101'),
        (kelas_10a_id, guru2_id, mapel2_id, 'Selasa', '07:30', '09:00', 'R-101');

    RAISE NOTICE 'Demo data seeded successfully!';
    RAISE NOTICE 'Login: admin@alfakhirschool.id / Admin@2025';
    RAISE NOTICE 'Login: budi.santoso@alfakhirschool.id / Admin@2025';
    RAISE NOTICE 'Login: ahmad.fauzi@siswa.alfakhirschool.id / Admin@2025';
END;
$$;
