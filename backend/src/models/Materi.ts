import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MateriAttributes {
  id: string;
  mata_pelajaran_id: string;
  kelas_id: string | null;
  guru_id: string | null;
  judul: string;
  deskripsi: string | null;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  link_video: string | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface MateriCreationAttributes extends Optional<MateriAttributes, 'id' | 'kelas_id' | 'guru_id' | 'deskripsi' | 'file_url' | 'file_name' | 'file_size' | 'link_video' | 'is_active'> {}

class Materi extends Model<MateriAttributes, MateriCreationAttributes> implements MateriAttributes {
  declare id: string;
  declare mata_pelajaran_id: string;
  declare kelas_id: string | null;
  declare guru_id: string | null;
  declare judul: string;
  declare deskripsi: string | null;
  declare file_url: string | null;
  declare file_name: string | null;
  declare file_size: number | null;
  declare link_video: string | null;
  declare is_active: boolean;
  declare created_at: Date;
  declare updated_at: Date;
}

Materi.init({
  id:                 { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mata_pelajaran_id:  { type: DataTypes.UUID, allowNull: false },
  kelas_id:           { type: DataTypes.UUID, allowNull: true },
  guru_id:            { type: DataTypes.UUID, allowNull: true },
  judul:              { type: DataTypes.STRING(255), allowNull: false },
  deskripsi:          { type: DataTypes.TEXT, allowNull: true },
  file_url:           { type: DataTypes.STRING(500), allowNull: true },
  file_name:          { type: DataTypes.STRING(255), allowNull: true },
  file_size:          { type: DataTypes.INTEGER, allowNull: true },
  link_video:         { type: DataTypes.STRING(500), allowNull: true },
  is_active:          { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
  sequelize,
  tableName: 'materi',
  underscored: true,
});

export default Materi;
