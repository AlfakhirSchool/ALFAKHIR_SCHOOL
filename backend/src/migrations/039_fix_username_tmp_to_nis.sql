-- Fix: ganti username TMP* dengan NIS dari tabel siswa
UPDATE users u
SET username = s.nis
FROM siswa s
WHERE s.user_id = u.id
  AND s.nis IS NOT NULL
  AND s.nis NOT LIKE 'TMP%'
  AND (u.username IS NULL OR u.username LIKE 'TMP%');
