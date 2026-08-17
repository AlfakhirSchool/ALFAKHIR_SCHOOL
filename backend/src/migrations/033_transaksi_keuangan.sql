CREATE TABLE IF NOT EXISTS transaksi_keuangan (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal       DATE NOT NULL,
  tipe          VARCHAR(20) NOT NULL CHECK (tipe IN ('pemasukan', 'pengeluaran')),
  kategori      VARCHAR(100) NOT NULL,
  sub_kategori  VARCHAR(100),
  unit          VARCHAR(10) NOT NULL DEFAULT 'Umum' CHECK (unit IN ('SD', 'SMP', 'Umum')),
  jumlah        BIGINT NOT NULL CHECK (jumlah > 0),
  keterangan    TEXT,
  metode        VARCHAR(20) NOT NULL DEFAULT 'tunai' CHECK (metode IN ('tunai', 'transfer', 'qris')),
  nama_pihak    VARCHAR(200),
  created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaksi_keuangan_tanggal ON transaksi_keuangan(tanggal);
CREATE INDEX IF NOT EXISTS idx_transaksi_keuangan_tipe ON transaksi_keuangan(tipe);
CREATE INDEX IF NOT EXISTS idx_transaksi_keuangan_unit ON transaksi_keuangan(unit);
CREATE INDEX IF NOT EXISTS idx_transaksi_keuangan_kategori ON transaksi_keuangan(kategori);
