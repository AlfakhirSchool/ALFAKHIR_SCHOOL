import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SiswaBerhalanganAttributes {
  id: string;
  siswa_id: string;
  tanggal: Date;
  hari_ke: number | null;
  catatan: string | null;
  created_by: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface SiswaBerhalanganCreationAttributes extends Optional<SiswaBerhalanganAttributes, 'id' | 'hari_ke' | 'catatan' | 'created_by'> {}

class SiswaBerhalangan extends Model<SiswaBerhalanganAttributes, SiswaBerhalanganCreationAttributes> implements SiswaBerhalanganAttributes {
  declare id: string;
  declare siswa_id: string;
  declare tanggal: Date;
  declare hari_ke: number | null;
  declare catatan: string | null;
  declare created_by: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

SiswaBerhalangan.init(
  {
    id:         { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    siswa_id:   { type: DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    tanggal:    { type: DataTypes.DATEONLY, allowNull: false },
    hari_ke:    { type: DataTypes.INTEGER, allowNull: true },
    catatan:    { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
  },
  {
    sequelize,
    tableName: 'siswa_berhalangan',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ unique: true, fields: ['siswa_id', 'tanggal'] }],
  }
);

export default SiswaBerhalangan;
