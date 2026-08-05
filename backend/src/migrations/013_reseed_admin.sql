-- Re-seed 4 admin accounts (production data recovery)
-- CATATAN: password_default dihapus dari file ini karena alasan keamanan.
-- Ganti password via dashboard atau UPDATE langsung ke DB setelah seed.
INSERT INTO users (email, password_hash, nama, role, school_level, is_active)
VALUES
  ('itferi@alfakhirschool.sch.id',    '$2b$10$KVdVh1jY03AfUOyRWUQ.ge6EAomDLxYZKtFVSPJG/Q0DcicWu5n8W', 'Administrator',       'admin', NULL,  true),
  ('admin.sd@alfakhirschool.sch.id',  '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Admin SD Al-Fakhir',  'admin', 'SD',  true),
  ('admin.smp@alfakhirschool.sch.id', '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Admin SMP Al-Fakhir', 'admin', 'SMP', true),
  ('admin.sma@alfakhirschool.sch.id', '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Admin SMA Al-Fakhir', 'admin', 'SMA', true)
ON CONFLICT (email) DO NOTHING;
