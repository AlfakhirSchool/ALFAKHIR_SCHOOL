import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type JenjangLevel = 'SD' | 'SMP' | 'SMA';

interface SekolahAttributes {
  id: string;
  nama: string;
  level: JenjangLevel;
}

interface SekolahCreationAttributes extends Optional<SekolahAttributes, 'id'> {}

class Sekolah extends Model<SekolahAttributes, SekolahCreationAttributes> implements SekolahAttributes {
  declare id: string;
  declare nama: string;
  declare level: JenjangLevel;
}

Sekolah.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nama: { type: DataTypes.STRING(255), allowNull: false },
    level: { type: DataTypes.ENUM('SD', 'SMP', 'SMA'), allowNull: false },
  },
  { sequelize, tableName: 'sekolah', timestamps: false }
);

export default Sekolah;
