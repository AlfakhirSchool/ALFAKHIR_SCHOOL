-- Per-siswa detail untuk jurnal guru
CREATE TABLE IF NOT EXISTS jurnal_siswa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jurnal_id UUID NOT NULL REFERENCES jurnal_guru(id) ON DELETE CASCADE,
    siswa_id UUID NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
    kehadiran VARCHAR(10) NOT NULL DEFAULT 'hadir', -- hadir, sakit, izin, alfa
    catatan TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (jurnal_id, siswa_id)
);

CREATE INDEX IF NOT EXISTS idx_jurnal_siswa_jurnal ON jurnal_siswa(jurnal_id);
CREATE INDEX IF NOT EXISTS idx_jurnal_siswa_siswa ON jurnal_siswa(siswa_id);
