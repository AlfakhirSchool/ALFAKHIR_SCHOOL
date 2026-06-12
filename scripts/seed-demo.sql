-- Al Fakhir School LMS - Demo Seed Data (schema-verified, UUID format)
-- Jalankan: psql -h 127.0.0.1 -p 5433 -U alfakhir -d alfakhir_school -f scripts/seed-demo.sql
-- Password default semua akun: Admin@1234

BEGIN;

-- Sekolah
INSERT INTO sekolah (id, nama, level) VALUES
  ('de8d4520-243f-ead3-69d0-6ec298111fc8', 'SD Islam Al Fakhir',  'SD'),
  ('1f2d7305-e3b8-4e84-43be-f46ab40624f6', 'SMP Islam Al Fakhir', 'SMP'),
  ('488c1b08-c654-2b7a-1698-f4a8f29c4eb7', 'SMA Islam Al Fakhir', 'SMA')
ON CONFLICT (id) DO NOTHING;

-- Users (bcrypt hash of 'Admin@1234')
INSERT INTO users (id, email, password_hash, nama, role, is_active) VALUES
  ('516ff1b2-2fff-e6d2-789a-f36635906fa5', 'admin@alfakhirschool.id',  '$2b$12$UOY92/I/nDxp1Kxn3SO7/.xB3Qu7HRnqxJchP3D9.Twbx/xJSzsce', 'Administrator',              'admin', true),
  ('cf79c7cb-24c1-a0ce-4590-1bdfbd63c235', 'guru1@alfakhirschool.id',  '$2b$12$UOY92/I/nDxp1Kxn3SO7/.xB3Qu7HRnqxJchP3D9.Twbx/xJSzsce', 'Bpk. Rizki Kurniawan, S.Pd', 'guru',  true),
  ('7ed03097-0f86-a66d-9afc-e9fc2e0364a1', 'guru2@alfakhirschool.id',  '$2b$12$UOY92/I/nDxp1Kxn3SO7/.xB3Qu7HRnqxJchP3D9.Twbx/xJSzsce', 'Ibu Sari Dewi, S.Pd',        'guru',  true),
  ('7d1b59a8-046a-7f2e-a0f5-959ee417678a', 'siswa1@alfakhirschool.id', '$2b$12$UOY92/I/nDxp1Kxn3SO7/.xB3Qu7HRnqxJchP3D9.Twbx/xJSzsce', 'Ahmad Rizky Pratama',        'siswa', true),
  ('b17d1c6c-d812-f1e8-02f4-be7dc3b527e7', 'siswa2@alfakhirschool.id', '$2b$12$UOY92/I/nDxp1Kxn3SO7/.xB3Qu7HRnqxJchP3D9.Twbx/xJSzsce', 'Siti Nurhaliza',             'siswa', true),
  ('088e3f54-9b8e-fc63-7dfc-0d4f7a9ecb5f', 'ortu1@alfakhirschool.id',  '$2b$12$UOY92/I/nDxp1Kxn3SO7/.xB3Qu7HRnqxJchP3D9.Twbx/xJSzsce', 'Bpk. Pratama',               'ortu',  true),
  ('ba3c24e4-a93b-37f9-2abd-3ecb069c6ec9', 'ortu2@alfakhirschool.id',  '$2b$12$UOY92/I/nDxp1Kxn3SO7/.xB3Qu7HRnqxJchP3D9.Twbx/xJSzsce', 'Ibu Nurhaliza',              'ortu',  true)
ON CONFLICT (id) DO NOTHING;

-- Guru
INSERT INTO guru (id, user_id, nip, spesialisasi, no_telp) VALUES
  ('92afb435-ceb1-6630-e982-7f54330c59c9', 'cf79c7cb-24c1-a0ce-4590-1bdfbd63c235', '198501012010011001', 'Matematika',       '0812-1111-2222'),
  ('440a21bd-2b3a-7c68-6cf3-238883dd34e9', '7ed03097-0f86-a66d-9afc-e9fc2e0364a1', '198701022010012002', 'Bahasa Indonesia',  '0813-2222-3333')
ON CONFLICT (id) DO NOTHING;

-- Kelas
INSERT INTO kelas (id, sekolah_id, nama, tingkat, wali_kelas_id, tahun_ajaran) VALUES
  ('a53fa2bc-2fbf-aca4-4e07-6c8dd1a3c448', '488c1b08-c654-2b7a-1698-f4a8f29c4eb7', 'X IPA 1', 10, '92afb435-ceb1-6630-e982-7f54330c59c9', '2025/2026'),
  ('a3f6e14c-9ee5-3107-78c4-e1fe2df6b308', '488c1b08-c654-2b7a-1698-f4a8f29c4eb7', 'X IPA 2', 10, '440a21bd-2b3a-7c68-6cf3-238883dd34e9', '2025/2026'),
  ('f67cfa8d-8e3e-b8f0-248a-7179f9eb4ad5', '1f2d7305-e3b8-4e84-43be-f46ab40624f6', 'VII A',    7, NULL,                                   '2025/2026'),
  ('71034ac3-b0d8-4b2b-b2cf-5ecc840b5c12', 'de8d4520-243f-ead3-69d0-6ec298111fc8', 'IV A',     4, NULL,                                   '2025/2026')
ON CONFLICT (id) DO NOTHING;

-- Siswa
INSERT INTO siswa (id, user_id, kelas_id, nisn, nis, no_induk, tanggal_lahir, alamat) VALUES
  ('013f0f67-779f-3b16-86c6-04db150d12ea', '7d1b59a8-046a-7f2e-a0f5-959ee417678a', 'a53fa2bc-2fbf-aca4-4e07-6c8dd1a3c448', '0012345001', 'SMA-001', '001', '2007-03-15', 'Jl. Siswa No. 1, Kota'),
  ('331633a2-46a4-e1ce-efc9-539a71fcd124', 'b17d1c6c-d812-f1e8-02f4-be7dc3b527e7', 'a53fa2bc-2fbf-aca4-4e07-6c8dd1a3c448', '0012345002', 'SMA-002', '002', '2007-07-20', 'Jl. Siswa No. 2, Kota')
ON CONFLICT (id) DO NOTHING;

-- Orang Tua
INSERT INTO orang_tua (id, user_id, siswa_id, hubungan, no_telp) VALUES
  ('93acfca3-c037-014a-a05f-7975661c09de', '088e3f54-9b8e-fc63-7dfc-0d4f7a9ecb5f', '013f0f67-779f-3b16-86c6-04db150d12ea', 'ayah', '0811-9999-0000'),
  ('05cfcea8-e248-558d-8891-8862d5f8fbec', 'ba3c24e4-a93b-37f9-2abd-3ecb069c6ec9', '331633a2-46a4-e1ce-efc9-539a71fcd124', 'ibu',  '0811-8888-0000')
ON CONFLICT (id) DO NOTHING;

-- Mata Pelajaran (kode harus unik)
INSERT INTO mata_pelajaran (id, nama, kode, kkm) VALUES
  ('16d7a7f5-d1b4-9fe6-74e7-a2cf724bb9dd', 'Matematika',       'MTK',  75),
  ('6c3b003a-4d39-bdf7-9fb2-dbaebb2777af', 'Bahasa Indonesia',  'BIND', 75),
  ('faa29582-0eb2-da28-6082-1cac2768be53', 'Fisika',            'FIS',  70),
  ('016549da-ee90-be60-f0ef-4668ab24aabc', 'PAI',               'PAI',  75),
  ('c209b827-2db1-34fd-ba43-35ee962fc9b0', 'IPA',               'IPA',  70),
  ('f101d45c-4d37-7223-3631-03fa5b24304b', 'IPS',               'IPS',  70)
ON CONFLICT (kode) DO NOTHING;

-- Jadwal Pelajaran
INSERT INTO jadwal_pelajaran (id, kelas_id, mata_pelajaran_id, guru_id, hari, jam_mulai, jam_selesai, ruangan) VALUES
  ('3e360f79-d5dc-c067-555a-4db82d65d90b', 'a53fa2bc-2fbf-aca4-4e07-6c8dd1a3c448', '16d7a7f5-d1b4-9fe6-74e7-a2cf724bb9dd', '92afb435-ceb1-6630-e982-7f54330c59c9', 'Senin', '07:00', '08:30', 'Ruang A1'),
  ('2921ff99-4e23-63cf-4ac6-bda916c4722b', 'a53fa2bc-2fbf-aca4-4e07-6c8dd1a3c448', '6c3b003a-4d39-bdf7-9fb2-dbaebb2777af', '440a21bd-2b3a-7c68-6cf3-238883dd34e9', 'Senin', '08:30', '10:00', 'Ruang A1'),
  ('d7e75b04-8dc4-ca2d-22a3-2609f650ea84', 'a53fa2bc-2fbf-aca4-4e07-6c8dd1a3c448', '16d7a7f5-d1b4-9fe6-74e7-a2cf724bb9dd', '92afb435-ceb1-6630-e982-7f54330c59c9', 'Rabu',  '07:00', '08:30', 'Ruang A1'),
  ('6bf3845c-0aa7-6022-0005-18897f30502c', 'a53fa2bc-2fbf-aca4-4e07-6c8dd1a3c448', 'faa29582-0eb2-da28-6082-1cac2768be53', '92afb435-ceb1-6630-e982-7f54330c59c9', 'Kamis', '09:00', '10:30', 'Lab IPA')
ON CONFLICT (id) DO NOTHING;

-- Pembayaran (status: belum_bayar/sebagian/lunas)
INSERT INTO pembayaran (id, siswa_id, tahun_ajaran, jenis_biaya, nominal_biaya, status, virtual_account, va_bank, tanggal_jatuh_tempo) VALUES
  ('4cab002c-bb96-a3f7-4e82-f466d1475c0e', '013f0f67-779f-3b16-86c6-04db150d12ea', '2025/2026', 'SPP Semester 1', 500000, 'lunas',      '8800001001', 'bca', '2025-06-10'),
  ('95067cd7-6f0c-e61d-973a-ec7cfcea3645', '013f0f67-779f-3b16-86c6-04db150d12ea', '2025/2026', 'SPP Semester 2', 500000, 'belum_bayar','8800001002', 'bca', '2025-12-10'),
  ('1599b074-65db-14f8-d5dd-6fde7c10ff72', '331633a2-46a4-e1ce-efc9-539a71fcd124', '2025/2026', 'SPP Semester 1', 500000, 'belum_bayar','8800002001', 'bca', '2025-06-10')
ON CONFLICT (id) DO NOTHING;

-- Nilai (kuis*10% + tugas*15% + uts*25% + uas*50%)
INSERT INTO nilai (id, siswa_id, mata_pelajaran_id, guru_id, semester, tahun_ajaran, kuis, tugas, uts, uas, nilai_akhir, grade, predikat, input_date) VALUES
  ('084e6596-baaa-df0c-e6f2-a37ad924906e', '013f0f67-779f-3b16-86c6-04db150d12ea', '16d7a7f5-d1b4-9fe6-74e7-a2cf724bb9dd', '92afb435-ceb1-6630-e982-7f54330c59c9', 1, '2025/2026', 80, 85, 78, 82, 81, 'B', 'Baik',        NOW()),
  ('c2ec406a-1477-6ee8-bd56-dcf0fbc3a224', '013f0f67-779f-3b16-86c6-04db150d12ea', '6c3b003a-4d39-bdf7-9fb2-dbaebb2777af', '440a21bd-2b3a-7c68-6cf3-238883dd34e9', 1, '2025/2026', 90, 88, 85, 87, 87, 'A', 'Sangat Baik', NOW()),
  ('0f59caac-48ec-e53f-49ff-48674a2d74a7', '331633a2-46a4-e1ce-efc9-539a71fcd124', '16d7a7f5-d1b4-9fe6-74e7-a2cf724bb9dd', '92afb435-ceb1-6630-e982-7f54330c59c9', 1, '2025/2026', 75, 78, 70, 73, 73, 'C', 'Cukup',       NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;

SELECT 'Seed data berhasil!' as status;
SELECT COUNT(*) || ' users'     as info FROM users;
SELECT COUNT(*) || ' siswa'     as info FROM siswa;
SELECT COUNT(*) || ' kelas'     as info FROM kelas;
SELECT COUNT(*) || ' jadwal'    as info FROM jadwal_pelajaran;
SELECT COUNT(*) || ' nilai'     as info FROM nilai;
SELECT COUNT(*) || ' pembayaran' as info FROM pembayaran;
SELECT 'Login: admin@alfakhirschool.id / Admin@1234' as login_info;
SELECT 'Login: guru1@alfakhirschool.id / Admin@1234' as guru_login;
SELECT 'Login: siswa1@alfakhirschool.id / Admin@1234' as siswa_login;
