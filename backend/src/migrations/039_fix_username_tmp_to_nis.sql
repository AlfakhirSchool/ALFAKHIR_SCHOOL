-- Fix 1: ganti username TMP* dengan NIS dari tabel siswa
UPDATE users u
SET username = s.nis
FROM siswa s
WHERE s.user_id = u.id
  AND s.nis IS NOT NULL
  AND s.nis NOT LIKE 'TMP%'
  AND (u.username IS NULL OR u.username LIKE 'TMP%');

-- Fix 2: untuk guru/admin/pewawancara yang username masih null, pakai bagian lokal dari email
UPDATE users
SET username = SPLIT_PART(email, '@', 1)
WHERE username IS NULL
  AND email IS NOT NULL
  AND role IN ('admin', 'guru', 'pewawancara', 'keuangan');
