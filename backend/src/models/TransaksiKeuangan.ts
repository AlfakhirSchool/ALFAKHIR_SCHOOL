import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type TipeTransaksi = 'pemasukan' | 'pengeluaran';
export type UnitTransaksi = 'SD' | 'SMP' | 'Umum';
export type MetodeTransaksi = 'tunai' | 'transfer' | 'qris';

interface TransaksiKeuanganAttributes {
  id: string;
  tanggal: string;
  tipe: TipeTransaksi;
  kategori: string;
  sub_kategori: string | null;
  unit: UnitTransaksi;
  jumlah: number;
  keterangan: string | null;
  metode: MetodeTransaksi;
  nama_pihak: string | null;
  created_by: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface TransaksiKeuanganCreationAttributes
  extends Optional<TransaksiKeuanganAttributes, 'id' | 'sub_kategori' | 'keterangan' | 'nama_pihak' | 'created_by'> {}

class TransaksiKeuangan
  extends Model<TransaksiKeuanganAttributes, TransaksiKeuanganCreationAttributes>
  implements TransaksiKeuanganAttributes {
  declare id: string;
  declare tanggal: string;
  declare tipe: TipeTransaksi;
  declare kategori: string;
  declare sub_kategori: string | null;
  declare unit: UnitTransaksi;
  declare jumlah: number;
  declare keterangan: string | null;
  declare metode: MetodeTransaksi;
  declare nama_pihak: string | null;
  declare created_by: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

TransaksiKeuangan.init(
  {
    id:           { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tanggal:      { type: DataTypes.DATEONLY, allowNull: false },
    tipe:         { type: DataTypes.ENUM('pemasukan', 'pengeluaran'), allowNull: false },
    kategori:     { type: DataTypes.STRING(100), allowNull: false },
    sub_kategori: { type: DataTypes.STRING(100), allowNull: true },
    unit:         { type: DataTypes.ENUM('SD', 'SMP', 'Umum'), allowNull: false, defaultValue: 'Umum' },
    jumlah:       { type: DataTypes.BIGINT, allowNull: false },
    keterangan:   { type: DataTypes.TEXT, allowNull: true },
    metode:       { type: DataTypes.ENUM('tunai', 'transfer', 'qris'), allowNull: false, defaultValue: 'tunai' },
    nama_pihak:   { type: DataTypes.STRING(200), allowNull: true },
    created_by:   { type: DataTypes.UUID, allowNull: true },
  },
  {
    sequelize,
    tableName: 'transaksi_keuangan',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default TransaksiKeuangan;
