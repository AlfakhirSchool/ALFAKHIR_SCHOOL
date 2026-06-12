import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PembayaranDetailAttributes {
  id: string;
  pembayaran_id: string;
  nominal_bayar: number;
  tanggal_bayar: Date;
  bank: string | null;
  reference_number: string | null;
  created_at?: Date;
}

interface PembayaranDetailCreationAttributes extends Optional<PembayaranDetailAttributes, 'id' | 'bank' | 'reference_number'> {}

class PembayaranDetail extends Model<PembayaranDetailAttributes, PembayaranDetailCreationAttributes> implements PembayaranDetailAttributes {
  declare id: string;
  declare pembayaran_id: string;
  declare nominal_bayar: number;
  declare tanggal_bayar: Date;
  declare bank: string | null;
  declare reference_number: string | null;
  declare readonly created_at: Date;
}

PembayaranDetail.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    pembayaran_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'pembayaran', key: 'id' } },
    nominal_bayar: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    tanggal_bayar: { type: DataTypes.DATE, allowNull: false },
    bank: { type: DataTypes.STRING(50), allowNull: true },
    reference_number: { type: DataTypes.STRING(100), allowNull: true },
  },
  {
    sequelize,
    tableName: 'pembayaran_detail',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at',
  }
);

export default PembayaranDetail;
