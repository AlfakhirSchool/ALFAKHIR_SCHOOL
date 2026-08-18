-- Buat email nullable (siswa tidak wajib punya email)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Bersihkan email palsu @siswa.alfakhir.sch.id dan TMP
UPDATE users SET email = NULL
WHERE email LIKE '%@siswa.alfakhir.sch.id'
   OR email LIKE 'TMP%';
