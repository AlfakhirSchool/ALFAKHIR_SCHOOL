-- Seed sekolah Al-Fakhir (SD, SMP, SMA) dan kelas awal
-- Idempotent: aman dijalankan berulang kali

INSERT INTO sekolah (id, nama, level)
SELECT gen_random_uuid(), 'SD Islam Al-Fakhir', 'SD'
WHERE NOT EXISTS (SELECT 1 FROM sekolah WHERE level = 'SD');

INSERT INTO sekolah (id, nama, level)
SELECT gen_random_uuid(), 'SMP Islam Al-Fakhir', 'SMP'
WHERE NOT EXISTS (SELECT 1 FROM sekolah WHERE level = 'SMP');

INSERT INTO sekolah (id, nama, level)
SELECT gen_random_uuid(), 'SMA Islam Al-Fakhir', 'SMA'
WHERE NOT EXISTS (SELECT 1 FROM sekolah WHERE level = 'SMA');

-- Kelas SD
DO $$
DECLARE
  v_sid UUID;
BEGIN
  SELECT id INTO v_sid FROM sekolah WHERE level = 'SD' LIMIT 1;
  IF v_sid IS NOT NULL THEN
    INSERT INTO kelas (id, sekolah_id, nama, tingkat, tahun_ajaran)
    SELECT gen_random_uuid(), v_sid, k.nama, k.tingkat, '2025/2026'
    FROM (VALUES
      ('1A An Na''im',    1),
      ('1B Al Ma''wa',    1),
      ('1C Al Adn',       1),
      ('1D Darussalam',   1)
    ) AS k(nama, tingkat)
    WHERE NOT EXISTS (
      SELECT 1 FROM kelas
      WHERE sekolah_id = v_sid AND nama = k.nama AND tahun_ajaran = '2025/2026'
    );
  END IF;
END $$;

-- Kelas SMP
DO $$
DECLARE
  v_sid UUID;
BEGIN
  SELECT id INTO v_sid FROM sekolah WHERE level = 'SMP' LIMIT 1;
  IF v_sid IS NOT NULL THEN
    INSERT INTO kelas (id, sekolah_id, nama, tingkat, tahun_ajaran)
    SELECT gen_random_uuid(), v_sid, k.nama, k.tingkat, '2025/2026'
    FROM (VALUES
      ('Ibnu Sina',       1),
      ('Ibnu Khaldun',    1),
      ('Al Haytham',      1),
      ('Ibnu Rusyd',      1),
      ('Al Khawarizmi',   1)
    ) AS k(nama, tingkat)
    WHERE NOT EXISTS (
      SELECT 1 FROM kelas
      WHERE sekolah_id = v_sid AND nama = k.nama AND tahun_ajaran = '2025/2026'
    );
  END IF;
END $$;
