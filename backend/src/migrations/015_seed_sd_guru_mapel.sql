-- Seed mata pelajaran SD
INSERT INTO mata_pelajaran (nama, kode, kkm, jam_pelajaran, jenjang)
SELECT nama, kode, kkm, jp, 'SD' FROM (VALUES
  ('Bahasa Inggris',        'BING',  70, 4),
  ('Matematika',            'MTK',   70, 4),
  ('IPA',                   'IPA',   70, 4),
  ('Bahasa Indonesia',      'BIND',  70, 2),
  ('PAI',                   'PAI',   70, 2),
  ('PKn',                   'PKN',   70, 2),
  ('Seni Budaya & Prakarya','SBDP',  70, 2),
  ('Bahasa Sunda',          'BSUN',  70, 2),
  ('PJOK',                  'PJOK',  70, 2),
  ('Tahsin',                'THSN',  70, 2)
) AS t(nama, kode, kkm, jp)
WHERE NOT EXISTS (SELECT 1 FROM mata_pelajaran WHERE nama = t.nama AND jenjang = 'SD');

-- Helper: insert guru (user + guru record)
-- Password default: alfakhir123 (hash bcrypt 10 rounds)
-- Hash: $2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC

INSERT INTO users (email, password_hash, nama, role, is_active, password_default)
VALUES
  ('arifah.hilyati@alfakhirschool.sch.id',       '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Arifah Hilyati, S.S., M.Pd',    'guru', true, 'alfakhir123'),
  ('wulan.apriningtyas@alfakhirschool.sch.id',    '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Wulan Apriningtyas, S.Pd.',      'guru', true, 'alfakhir123'),
  ('aini.febiyanti@alfakhirschool.sch.id',        '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Aini Febiyanti, S.Pd.',          'guru', true, 'alfakhir123'),
  ('lulu.luthfiyah@alfakhirschool.sch.id',        '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Lu''lu'' Luthfiyah, S.Pd.',      'guru', true, 'alfakhir123'),
  ('halimahtus.sadiyah@alfakhirschool.sch.id',    '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Halimahtus Sadiyah, S.Pd.',      'guru', true, 'alfakhir123'),
  ('royan.dharuriyat@alfakhirschool.sch.id',      '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Royan Dharuriyat, S.Pd.',        'guru', true, 'alfakhir123'),
  ('inggrid.ayuparaswati@alfakhirschool.sch.id',  '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Inggrid Ayuparaswati, S.Pd.',    'guru', true, 'alfakhir123'),
  ('nurlaili.muharram@alfakhirschool.sch.id',      '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Nurlaili Muharram, S.Pd.',       'guru', true, 'alfakhir123'),
  ('abdul.malik@alfakhirschool.sch.id',           '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Abdul Malik',                    'guru', true, 'alfakhir123'),
  ('ahdan@alfakhirschool.sch.id',                 '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Ahdan',                          'guru', true, 'alfakhir123'),
  ('m.faisal@alfakhirschool.sch.id',              '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'M. Faisal, S.Sos',               'guru', true, 'alfakhir123'),
  ('nur.faidah@alfakhirschool.sch.id',            '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Nur Faidah Djaelani, S.Pd.',     'guru', true, 'alfakhir123'),
  ('dedi.setiadi@alfakhirschool.sch.id',          '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Dedi Setiadi',                   'guru', true, 'alfakhir123'),
  ('nazli@alfakhirschool.sch.id',                 '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Nazli',                          'guru', true, 'alfakhir123')
ON CONFLICT (email) DO NOTHING;

-- Create guru records with SD jenjang and spesialisasi
INSERT INTO guru (user_id, school_levels, spesialisasi)
SELECT u.id, ARRAY['SD'],
  CASE u.email
    WHEN 'arifah.hilyati@alfakhirschool.sch.id'      THEN ''
    WHEN 'wulan.apriningtyas@alfakhirschool.sch.id'   THEN 'SD:Bahasa Inggris, SD:Matematika, SD:IPA'
    WHEN 'aini.febiyanti@alfakhirschool.sch.id'       THEN 'SD:Bahasa Inggris, SD:Matematika, SD:IPA'
    WHEN 'lulu.luthfiyah@alfakhirschool.sch.id'       THEN 'SD:Bahasa Inggris, SD:Matematika, SD:IPA, SD:Tahsin'
    WHEN 'halimahtus.sadiyah@alfakhirschool.sch.id'   THEN 'SD:Bahasa Inggris, SD:Matematika, SD:IPA'
    WHEN 'royan.dharuriyat@alfakhirschool.sch.id'     THEN 'SD:Bahasa Indonesia, SD:PAI, SD:PKn, SD:Seni Budaya & Prakarya, SD:Bahasa Sunda, SD:Tahsin'
    WHEN 'inggrid.ayuparaswati@alfakhirschool.sch.id' THEN 'SD:Bahasa Indonesia, SD:PAI, SD:PKn, SD:Seni Budaya & Prakarya, SD:Bahasa Sunda, SD:Tahsin'
    WHEN 'nurlaili.muharram@alfakhirschool.sch.id'    THEN 'SD:Bahasa Indonesia, SD:PAI, SD:PKn, SD:Seni Budaya & Prakarya, SD:Bahasa Sunda, SD:Tahsin'
    WHEN 'abdul.malik@alfakhirschool.sch.id'          THEN 'SD:Bahasa Indonesia, SD:PAI, SD:PKn, SD:Seni Budaya & Prakarya, SD:Bahasa Sunda, SD:Tahsin'
    WHEN 'ahdan@alfakhirschool.sch.id'                THEN 'SD:PJOK'
    WHEN 'm.faisal@alfakhirschool.sch.id'             THEN 'SD:Tahsin'
    WHEN 'nur.faidah@alfakhirschool.sch.id'           THEN 'SD:Tahsin'
    WHEN 'dedi.setiadi@alfakhirschool.sch.id'         THEN 'SD:Tahsin'
    WHEN 'nazli@alfakhirschool.sch.id'                THEN 'SD:Tahsin'
    ELSE ''
  END
FROM users u
WHERE u.email IN (
  'arifah.hilyati@alfakhirschool.sch.id',
  'wulan.apriningtyas@alfakhirschool.sch.id',
  'aini.febiyanti@alfakhirschool.sch.id',
  'lulu.luthfiyah@alfakhirschool.sch.id',
  'halimahtus.sadiyah@alfakhirschool.sch.id',
  'royan.dharuriyat@alfakhirschool.sch.id',
  'inggrid.ayuparaswati@alfakhirschool.sch.id',
  'nurlaili.muharram@alfakhirschool.sch.id',
  'abdul.malik@alfakhirschool.sch.id',
  'ahdan@alfakhirschool.sch.id',
  'm.faisal@alfakhirschool.sch.id',
  'nur.faidah@alfakhirschool.sch.id',
  'dedi.setiadi@alfakhirschool.sch.id',
  'nazli@alfakhirschool.sch.id'
)
AND NOT EXISTS (SELECT 1 FROM guru WHERE guru.user_id = u.id);
