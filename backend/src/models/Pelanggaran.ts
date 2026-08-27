import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PelanggaranAttributes {
  id: string;
  siswa_id: string;
  guru_id: string | null;
  jenis_pelanggaran: string;
  poin: number;
  keterangan: string | null;
  tanggal: Date;
  created_at?: Date;
  updated_at?: Date;
}

interface PelanggaranCreationAttributes extends Optional<PelanggaranAttributes, 'id' | 'guru_id' | 'keterangan'> {}

class Pelanggaran extends Model<PelanggaranAttributes, PelanggaranCreationAttributes> implements PelanggaranAttributes {
  declare id: string;
  declare siswa_id: string;
  declare guru_id: string | null;
  declare jenis_pelanggaran: string;
  declare poin: number;
  declare keterangan: string | null;
  declare tanggal: Date;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

Pelanggaran.init(
  {
    id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    siswa_id:          { type: DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    guru_id:           { type: DataTypes.UUID, allowNull: true, references: { model: 'guru', key: 'id' } },
    jenis_pelanggaran: { type: DataTypes.STRING(255), allowNull: false },
    poin:              { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    keterangan:        { type: DataTypes.TEXT, allowNull: true },
    tanggal:           { type: DataTypes.DATEONLY, allowNull: false },
  },
  {
    sequelize,
    tableName: 'pelanggaran',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Pelanggaran;
