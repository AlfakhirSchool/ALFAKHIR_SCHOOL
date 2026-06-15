#!/bin/bash
# Jalankan di Proxmox CT 101: bash /root/alfakhir/scripts/seed-users.sh

DB_CONTAINER="alfakhir_postgres"
DB_USER="alfakhir"
DB_NAME="alfakhir_school"
# Password hash untuk "winky123" (bcrypt rounds 12)
HASH='$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uXkP4y6/y'

echo "=== Seeding users ke database ==="

docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME << SQL

-- Admin
INSERT INTO users (id, email, password_hash, nama, role, is_active)
VALUES (uuid_generate_v4(), 'admin@alfakhirschool.id', '$HASH', 'Administrator', 'admin', true)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Siswa demo
INSERT INTO users (id, email, password_hash, nama, role, is_active)
VALUES (uuid_generate_v4(), 'siswa@alfakhirschool.id', '$HASH', 'Ahmad Fauzi', 'siswa', true)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Orang tua demo
INSERT INTO users (id, email, password_hash, nama, role, is_active)
VALUES (uuid_generate_v4(), 'ortu@alfakhirschool.id', '$HASH', 'Bapak Fauzi', 'ortu', true)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Tampilkan semua user
SELECT email, nama, role FROM users ORDER BY role;

SQL

echo ""
echo "=== SELESAI! Kredensial login: ==="
echo "Admin    : admin@alfakhirschool.id  / winky123"
echo "Siswa    : siswa@alfakhirschool.id  / winky123"
echo "Orang Tua: ortu@alfakhirschool.id   / winky123"
