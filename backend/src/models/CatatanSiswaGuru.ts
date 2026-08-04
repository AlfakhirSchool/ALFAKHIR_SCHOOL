import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CatatanSiswaGuruAttributes {
  id: string;
  siswa_id: string;
  guru_id: string;
  tanggal: string;
  judul: string | null;
  isi: string;
  foto_url: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface CatatanSiswaGuruCreation extends Optional<CatatanSiswaGuruAttributes, 'id' | 'judul' | 'foto_url'> {}

class CatatanSiswaGuru extends Model<CatatanSiswaGuruAttributes, CatatanSiswaGuruCreation> implements CatatanSiswaGuruAttributes {
  declare id: string;
  declare siswa_id: string;
  declare guru_id: string;
  declare tanggal: string;
  declare judul: string | null;
  declare isi: string;
  declare foto_url: string | null;
}

CatatanSiswaGuru.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    siswa_id: { type: DataTypes.UUID, allowNull: false },
    guru_id: { type: DataTypes.UUID, allowNull: false },
    tanggal: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    judul: { type: DataTypes.STRING(255), allowNull: true },
    isi: { type: DataTypes.TEXT, allowNull: false },
    foto_url: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    sequelize,
    tableName: 'catatan_siswa',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default CatatanSiswaGuru;
