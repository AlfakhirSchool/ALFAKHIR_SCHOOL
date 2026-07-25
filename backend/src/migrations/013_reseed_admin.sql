-- Re-seed 4 admin accounts (production data recovery)
INSERT INTO users (email, password_hash, nama, role, school_level, password_default, is_active)
VALUES
  ('itferi@alfakhirschool.sch.id',    '$2b$10$KVdVh1jY03AfUOyRWUQ.ge6EAomDLxYZKtFVSPJG/Q0DcicWu5n8W', 'Administrator',       'admin', NULL,  'winky123#', true),
  ('admin.sd@alfakhirschool.sch.id',  '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Admin SD Al-Fakhir',  'admin', 'SD',  NULL,        true),
  ('admin.smp@alfakhirschool.sch.id', '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Admin SMP Al-Fakhir', 'admin', 'SMP', NULL,        true),
  ('admin.sma@alfakhirschool.sch.id', '$2b$10$MvlrSJWg6F0z9ACwf6UyGeLys3LF/0cYIIb9U3qtmIC7LthpGCMYC', 'Admin SMA Al-Fakhir', 'admin', 'SMA', NULL,        true)
ON CONFLICT (email) DO NOTHING;
