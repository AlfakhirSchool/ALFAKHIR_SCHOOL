-- Al Fakhir School LMS - Initial Database Schema
-- Run: psql -U alfakhir -d alfakhir_school -f 001_init_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nama VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'guru', 'siswa', 'ortu')),
    is_active BOOLEAN DEFAULT true,
    profile_pic VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SEKOLAH
CREATE TABLE IF NOT EXISTS sekolah (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    level VARCHAR(5) NOT NULL CHECK (level IN ('SD', 'SMP', 'SMA'))
);

-- 3. GURU
CREATE TABLE IF NOT EXISTS guru (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    nip VARCHAR(30) UNIQUE,
    spesialisasi VARCHAR(255),
    no_telp VARCHAR(20)
);

-- 4. KELAS
CREATE TABLE IF NOT EXISTS kelas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sekolah_id UUID NOT NULL REFERENCES sekolah(id),
    nama VARCHAR(100) NOT NULL,
    tingkat INTEGER NOT NULL,
    wali_kelas_id UUID REFERENCES guru(id),
    tahun_ajaran VARCHAR(20) NOT NULL
);

-- 5. SISWA
CREATE TABLE IF NOT EXISTS siswa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    kelas_id UUID NOT NULL REFERENCES kelas(id),
    nisn VARCHAR(20) NOT NULL UNIQUE,
    nis VARCHAR(20) NOT NULL,
    no_induk VARCHAR(20) NOT NULL,
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    alamat TEXT
);

-- 6. ORANG TUA
CREATE TABLE IF NOT EXISTS orang_tua (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    siswa_id UUID NOT NULL REFERENCES siswa(id),
    hubungan VARCHAR(50) NOT NULL,
    no_telp VARCHAR(20)
);

-- 7. MATA PELAJARAN
CREATE TABLE IF NOT EXISTS mata_pelajaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(20) NOT NULL UNIQUE,
    kkm INTEGER NOT NULL DEFAULT 75
);

-- 8. JADWAL PELAJARAN
CREATE TABLE IF NOT EXISTS jadwal_pelajaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kelas_id UUID NOT NULL REFERENCES kelas(id),
    guru_id UUID NOT NULL REFERENCES guru(id),
    mata_pelajaran_id UUID NOT NULL REFERENCES mata_pelajaran(id),
    hari VARCHAR(10) NOT NULL CHECK (hari IN ('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu')),
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    ruangan VARCHAR(50)
);

-- 9. QR CODE SESSION
CREATE TABLE IF NOT EXISTS qr_code_session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jadwal_pelajaran_id UUID NOT NULL REFERENCES jadwal_pelajaran(id),
    tanggal DATE NOT NULL,
    unique_code VARCHAR(6) NOT NULL,
    qr_data TEXT NOT NULL,
    aktif BOOLEAN DEFAULT true,
    waktu_mulai TIMESTAMP WITH TIME ZONE NOT NULL,
    waktu_selesai TIMESTAMP WITH TIME ZONE
);

-- 10. ABSENSI
CREATE TABLE IF NOT EXISTS absensi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    siswa_id UUID NOT NULL REFERENCES siswa(id),
    jadwal_pelajaran_id UUID NOT NULL REFERENCES jadwal_pelajaran(id),
    tanggal DATE NOT NULL,
    waktu_hadir TIMESTAMP WITH TIME ZONE,
    status VARCHAR(10) NOT NULL CHECK (status IN ('hadir','sakit','izin','alfa')),
    qr_code_scanned BOOLEAN DEFAULT false,
    input_code VARCHAR(6),
    catatan TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(siswa_id, jadwal_pelajaran_id, tanggal)
);

-- 11. NILAI
CREATE TABLE IF NOT EXISTS nilai (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    siswa_id UUID NOT NULL REFERENCES siswa(id),
    mata_pelajaran_id UUID NOT NULL REFERENCES mata_pelajaran(id),
    guru_id UUID NOT NULL REFERENCES guru(id),
    semester INTEGER NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    kuis DECIMAL(5,2),
    tugas DECIMAL(5,2),
    uts DECIMAL(5,2),
    uas DECIMAL(5,2),
    nilai_akhir DECIMAL(5,2),
    grade VARCHAR(2),
    predikat VARCHAR(30),
    catatan TEXT,
    input_date TIMESTAMP WITH TIME ZONE,
    update_date TIMESTAMP WITH TIME ZONE,
    UNIQUE(siswa_id, mata_pelajaran_id, semester, tahun_ajaran)
);

-- 12. PEMBAYARAN
CREATE TABLE IF NOT EXISTS pembayaran (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    siswa_id UUID NOT NULL REFERENCES siswa(id),
    tahun_ajaran VARCHAR(20) NOT NULL,
    jenis_biaya VARCHAR(100) NOT NULL,
    nominal_biaya DECIMAL(15,2) NOT NULL,
    nominal_terbayar DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(15) NOT NULL DEFAULT 'belum_bayar' CHECK (status IN ('belum_bayar','sebagian','lunas')),
    virtual_account VARCHAR(30),
    va_bank VARCHAR(10) CHECK (va_bank IN ('bca','mandiri')),
    tanggal_jatuh_tempo DATE,
    tanggal_bayar TIMESTAMP WITH TIME ZONE,
    metode_bayar VARCHAR(50),
    bukti_bayar VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. PEMBAYARAN DETAIL
CREATE TABLE IF NOT EXISTS pembayaran_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pembayaran_id UUID NOT NULL REFERENCES pembayaran(id),
    nominal_bayar DECIMAL(15,2) NOT NULL,
    tanggal_bayar TIMESTAMP WITH TIME ZONE NOT NULL,
    bank VARCHAR(50),
    reference_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. RAPOR
CREATE TABLE IF NOT EXISTS rapor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    siswa_id UUID NOT NULL REFERENCES siswa(id),
    semester INTEGER NOT NULL,
    tahun_ajaran VARCHAR(20) NOT NULL,
    jumlah_hadir INTEGER DEFAULT 0,
    jumlah_sakit INTEGER DEFAULT 0,
    jumlah_izin INTEGER DEFAULT 0,
    jumlah_alfa INTEGER DEFAULT 0,
    nilai_rata_rata DECIMAL(5,2),
    ranking INTEGER,
    pdf_file VARCHAR(500),
    generated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(siswa_id, semester, tahun_ajaran)
);

-- 15. JURNAL GURU
CREATE TABLE IF NOT EXISTS jurnal_guru (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guru_id UUID NOT NULL REFERENCES guru(id),
    wali_kelas_id UUID REFERENCES guru(id),
    kelas_id UUID NOT NULL REFERENCES kelas(id),
    mata_pelajaran_id UUID NOT NULL REFERENCES mata_pelajaran(id),
    tanggal DATE NOT NULL,
    hari VARCHAR(10) NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    topik_pelajaran VARCHAR(500) NOT NULL,
    metode_pembelajaran TEXT,
    deskripsi_pembelajaran TEXT,
    hasil_pembelajaran TEXT,
    hambatan_pembelajaran TEXT,
    rencana_tindak_lanjut TEXT,
    media_pembelajaran TEXT,
    sumber_belajar TEXT,
    jumlah_siswa_hadir INTEGER DEFAULT 0,
    jumlah_siswa_sakit INTEGER DEFAULT 0,
    jumlah_siswa_izin INTEGER DEFAULT 0,
    jumlah_siswa_alfa INTEGER DEFAULT 0,
    ttd_guru TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    ttd_wali_kelas TEXT,
    wali_kelas_signed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(15) DEFAULT 'draft' CHECK (status IN ('draft','submitted','reviewed','approved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 16. ACTIVITY LOG
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_siswa_kelas ON siswa(kelas_id);
CREATE INDEX IF NOT EXISTS idx_absensi_siswa_tanggal ON absensi(siswa_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_jadwal_tanggal ON absensi(jadwal_pelajaran_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_nilai_siswa ON nilai(siswa_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_siswa ON pembayaran(siswa_id);
CREATE INDEX IF NOT EXISTS idx_pembayaran_status ON pembayaran(status);
CREATE INDEX IF NOT EXISTS idx_jurnal_guru_tanggal ON jurnal_guru(guru_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_jurnal_kelas ON jurnal_guru(kelas_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- SEED DATA: Initial Admin User (password: Admin@2025)
INSERT INTO users (id, email, password_hash, nama, role) VALUES (
    uuid_generate_v4(),
    'admin@alfakhirschool.id',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFBkaYXbvBvbqxO', -- Admin@2025
    'Administrator',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- SEED DATA: School Units
INSERT INTO sekolah (nama, level) VALUES
    ('SD Islam Modern Al Fakhir', 'SD'),
    ('SMP Islam Modern Al Fakhir', 'SMP'),
    ('SMA Islam Modern Al Fakhir', 'SMA')
ON CONFLICT DO NOTHING;
