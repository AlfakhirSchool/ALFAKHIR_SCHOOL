-- Tambah kolom username, populate dari email (bagian sebelum @)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
UPDATE users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
-- ALTER TABLE users ALTER COLUMN username SET NOT NULL; -- aktifkan setelah semua data terisi

-- User tes: username=Tes, password=Tess (bcrypt hash)
INSERT INTO users (email, username, password_hash, nama, role, is_active)
VALUES ('tes@internal', 'Tes', '$2b$10$O7voPH97UgNPpkV.ws.5au05WshJ9iYOQJlF.Z4nRYcA3ID4kYcve', 'User Tes', 'admin', true)
ON CONFLICT (email) DO NOTHING;
