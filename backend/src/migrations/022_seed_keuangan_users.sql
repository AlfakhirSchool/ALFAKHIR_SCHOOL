-- Buat/update akun keuangan: nurhidayati dan miaandini
INSERT INTO users (email, password_hash, nama, role, school_level, is_active, created_at, updated_at)
VALUES
  ('nurhidayati',
   '$2b$10$oNBfrVtguDldVa8UenYoK.UwDnOfF6.fWeMOPPbw6GDhkE3wqdX6C',
   'Nurhidayati, S.Pd.',
   'keuangan', NULL, true, NOW(), NOW()),
  ('miaandini',
   '$2b$10$9I2yVndpq0xY3kbs1Kt/7.JOtKYBqWH4Y3cp4JZp8j4ui0XW9wTs2',
   'Mia Andini Caniago, S.Ak.',
   'keuangan', NULL, true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      nama          = EXCLUDED.nama,
      role          = EXCLUDED.role,
      is_active     = true,
      updated_at    = NOW();
