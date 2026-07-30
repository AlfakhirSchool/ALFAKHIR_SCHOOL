-- Tambah nilai 'pewawancara' ke ENUM role users
ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'pewawancara';
