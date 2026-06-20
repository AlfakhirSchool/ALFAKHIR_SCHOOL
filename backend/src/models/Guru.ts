import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface GuruAttributes {
  id: string;
  user_id: string;
  nip: string | null;
  spesialisasi: string | null;
  no_telp: string | null;
  school_levels: string[] | null;
}

interface GuruCreationAttributes extends Optional<GuruAttributes, 'id' | 'nip' | 'spesialisasi' | 'no_telp' | 'school_levels'> {}

class Guru extends Model<GuruAttributes, GuruCreationAttributes> implements GuruAttributes {
  declare id: string;
  declare user_id: string;
  declare nip: string | null;
  declare spesialisasi: string | null;
  declare no_telp: string | null;
  declare school_levels: string[] | null;
}

Guru.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false, unique: true, references: { model: 'users', key: 'id' } },
    nip: { type: DataTypes.STRING(30), allowNull: true, unique: true },
    spesialisasi: { type: DataTypes.STRING(255), allowNull: true },
    no_telp: { type: DataTypes.STRING(20), allowNull: true },
    school_levels: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true, defaultValue: [] },
  },
  { sequelize, tableName: 'guru', timestamps: false }
);

export default Guru;
