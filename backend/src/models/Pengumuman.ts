import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PengumumanAttributes {
  id: string;
  judul: string;
  isi: string;
  kategori: string;
  target_role: string;
  school_level: string;
  is_active: boolean;
  tanggal_publish: Date;
  created_by: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface PengumumanCreationAttributes extends Optional<PengumumanAttributes, 'id' | 'kategori' | 'target_role' | 'school_level' | 'is_active' | 'tanggal_publish' | 'created_by'> {}

class Pengumuman extends Model<PengumumanAttributes, PengumumanCreationAttributes> implements PengumumanAttributes {
  declare id: string;
  declare judul: string;
  declare isi: string;
  declare kategori: string;
  declare target_role: string;
  declare school_level: string;
  declare is_active: boolean;
  declare tanggal_publish: Date;
  declare created_by: string | null;
}

Pengumuman.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  judul: { type: DataTypes.STRING(255), allowNull: false },
  isi: { type: DataTypes.TEXT, allowNull: false },
  kategori: { type: DataTypes.STRING(50), defaultValue: 'Pengumuman' },
  target_role: { type: DataTypes.STRING(20), defaultValue: 'all' },
  school_level: { type: DataTypes.STRING(10), defaultValue: 'SD' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  tanggal_publish: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  created_by: { type: DataTypes.UUID, allowNull: true },
}, {
  sequelize,
  tableName: 'pengumuman',
  underscored: true,
});

export default Pengumuman;
