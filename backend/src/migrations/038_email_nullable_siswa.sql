-- Buat email nullable (siswa tidak wajib punya email)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Bersihkan email palsu @siswa.alfakhir.sch.id dan TMP
UPDATE users SET email = NULL
WHERE email LIKE '%@siswa.alfakhir.sch.id'
   OR email LIKE 'TMP%';

-- Set username = NIS untuk siswa yang belum punya username
UPDATE users u
SET username = s.nis
FROM siswa s
WHERE s.user_id = u.id
  AND u.username IS NULL
  AND s.nis IS NOT NULL
  AND s.nis NOT LIKE 'TMP%';
