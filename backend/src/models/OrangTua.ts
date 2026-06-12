import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface OrangTuaAttributes {
  id: string;
  user_id: string;
  siswa_id: string;
  hubungan: string;
  no_telp: string | null;
}

interface OrangTuaCreationAttributes extends Optional<OrangTuaAttributes, 'id' | 'no_telp'> {}

class OrangTua extends Model<OrangTuaAttributes, OrangTuaCreationAttributes> implements OrangTuaAttributes {
  declare id: string;
  declare user_id: string;
  declare siswa_id: string;
  declare hubungan: string;
  declare no_telp: string | null;
}

OrangTua.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    siswa_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    hubungan: { type: DataTypes.STRING(50), allowNull: false },
    no_telp: { type: DataTypes.STRING(20), allowNull: true },
  },
  { sequelize, tableName: 'orang_tua', timestamps: false }
);

export default OrangTua;
