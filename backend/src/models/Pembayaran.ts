import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type StatusPembayaran = 'belum_bayar' | 'sebagian' | 'lunas';
export type VaBank = 'bca' | 'mandiri';

interface PembayaranAttributes {
  id: string;
  siswa_id: string;
  tahun_ajaran: string;
  jenis_biaya: string;
  nominal_biaya: number;
  nominal_terbayar: number;
  status: StatusPembayaran;
  virtual_account: string | null;
  va_bank: VaBank | null;
  tanggal_jatuh_tempo: Date | null;
  tanggal_bayar: Date | null;
  metode_bayar: string | null;
  bukti_bayar: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface PembayaranCreationAttributes extends Optional<PembayaranAttributes, 'id' | 'nominal_terbayar' | 'status' | 'virtual_account' | 'va_bank' | 'tanggal_jatuh_tempo' | 'tanggal_bayar' | 'metode_bayar' | 'bukti_bayar'> {}

class Pembayaran extends Model<PembayaranAttributes, PembayaranCreationAttributes> implements PembayaranAttributes {
  declare id: string;
  declare siswa_id: string;
  declare tahun_ajaran: string;
  declare jenis_biaya: string;
  declare nominal_biaya: number;
  declare nominal_terbayar: number;
  declare status: StatusPembayaran;
  declare virtual_account: string | null;
  declare va_bank: VaBank | null;
  declare tanggal_jatuh_tempo: Date | null;
  declare tanggal_bayar: Date | null;
  declare metode_bayar: string | null;
  declare bukti_bayar: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Pembayaran.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    siswa_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    tahun_ajaran: { type: DataTypes.STRING(20), allowNull: false },
    jenis_biaya: { type: DataTypes.STRING(100), allowNull: false },
    nominal_biaya: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    nominal_terbayar: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    status: { type: DataTypes.ENUM('belum_bayar', 'sebagian', 'lunas'), defaultValue: 'belum_bayar' },
    virtual_account: { type: DataTypes.STRING(30), allowNull: true },
    va_bank: { type: DataTypes.ENUM('bca', 'mandiri'), allowNull: true },
    tanggal_jatuh_tempo: { type: DataTypes.DATEONLY, allowNull: true },
    tanggal_bayar: { type: DataTypes.DATE, allowNull: true },
    metode_bayar: { type: DataTypes.STRING(50), allowNull: true },
    bukti_bayar: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    sequelize,
    tableName: 'pembayaran',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['siswa_id', 'tahun_ajaran', 'jenis_biaya'], name: 'pembayaran_siswa_tahun_jenis_unique' },
    ],
  }
);

export default Pembayaran;
