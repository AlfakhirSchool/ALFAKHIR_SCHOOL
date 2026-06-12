import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SiswaAttributes {
  id: string;
  user_id: string;
  kelas_id: string;
  nisn: string;
  nis: string;
  no_induk: string;
  tempat_lahir: string | null;
  tanggal_lahir: Date | null;
  alamat: string | null;
}

interface SiswaCreationAttributes extends Optional<SiswaAttributes, 'id' | 'tempat_lahir' | 'tanggal_lahir' | 'alamat'> {}

class Siswa extends Model<SiswaAttributes, SiswaCreationAttributes> implements SiswaAttributes {
  declare id: string;
  declare user_id: string;
  declare kelas_id: string;
  declare nisn: string;
  declare nis: string;
  declare no_induk: string;
  declare tempat_lahir: string | null;
  declare tanggal_lahir: Date | null;
  declare alamat: string | null;
}

Siswa.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false, unique: true, references: { model: 'users', key: 'id' } },
    kelas_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'kelas', key: 'id' } },
    nisn: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    nis: { type: DataTypes.STRING(20), allowNull: false },
    no_induk: { type: DataTypes.STRING(20), allowNull: false },
    tempat_lahir: { type: DataTypes.STRING(100), allowNull: true },
    tanggal_lahir: { type: DataTypes.DATEONLY, allowNull: true },
    alamat: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: 'siswa', timestamps: false }
);

export default Siswa;
