import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MataPelajaranAttributes {
  id: string;
  nama: string;
  kode: string;
  kkm: number;
}

interface MataPelajaranCreationAttributes extends Optional<MataPelajaranAttributes, 'id'> {}

class MataPelajaran extends Model<MataPelajaranAttributes, MataPelajaranCreationAttributes> implements MataPelajaranAttributes {
  declare id: string;
  declare nama: string;
  declare kode: string;
  declare kkm: number;
}

MataPelajaran.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nama: { type: DataTypes.STRING(255), allowNull: false },
    kode: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    kkm: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 75 },
  },
  { sequelize, tableName: 'mata_pelajaran', timestamps: false }
);

export default MataPelajaran;
