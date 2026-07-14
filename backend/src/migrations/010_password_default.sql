-- Simpan password default (plaintext) untuk ditampilkan admin master
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_default VARCHAR(100);
