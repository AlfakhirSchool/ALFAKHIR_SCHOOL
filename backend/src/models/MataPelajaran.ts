import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MataPelajaranAttributes {
  id: string;
  nama: string;
  kode: string;
  kkm: number;
  jenjang: string | null;
  jam_pelajaran: number | null;
}

interface MataPelajaranCreationAttributes extends Optional<MataPelajaranAttributes, 'id' | 'jenjang' | 'jam_pelajaran'> {}

class MataPelajaran extends Model<MataPelajaranAttributes, MataPelajaranCreationAttributes> implements MataPelajaranAttributes {
  declare id: string;
  declare nama: string;
  declare kode: string;
  declare kkm: number;
  declare jenjang: string | null;
  declare jam_pelajaran: number | null;
}

MataPelajaran.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nama: { type: DataTypes.STRING(255), allowNull: false },
    kode: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    kkm: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 75 },
    jenjang: { type: DataTypes.STRING(10), allowNull: true },
    jam_pelajaran: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, tableName: 'mata_pelajaran', timestamps: false }
);

export default MataPelajaran;
