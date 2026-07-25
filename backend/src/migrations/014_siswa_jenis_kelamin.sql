ALTER TABLE siswa ADD COLUMN IF NOT EXISTS jenis_kelamin CHAR(1) CHECK (jenis_kelamin IN ('L', 'P'));
