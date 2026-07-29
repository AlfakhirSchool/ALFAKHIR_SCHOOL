import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SiswaAttributes {
  id: string;
  user_id: string;
  kelas_id: string;
  nisn: string | null;
  nis: string | null;
  no_induk: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: Date | null;
  alamat: string | null;
  jenis_kelamin: string | null;
}

interface SiswaCreationAttributes extends Optional<SiswaAttributes, 'id' | 'nisn' | 'nis' | 'no_induk' | 'tempat_lahir' | 'tanggal_lahir' | 'alamat' | 'jenis_kelamin'> {}

class Siswa extends Model<SiswaAttributes, SiswaCreationAttributes> implements SiswaAttributes {
  declare id: string;
  declare user_id: string;
  declare kelas_id: string;
  declare nisn: string | null;
  declare nis: string | null;
  declare no_induk: string | null;
  declare tempat_lahir: string | null;
  declare tanggal_lahir: Date | null;
  declare alamat: string | null;
  declare jenis_kelamin: string | null;
}

Siswa.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false, unique: true, references: { model: 'users', key: 'id' } },
    kelas_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'kelas', key: 'id' } },
    nisn: { type: DataTypes.STRING(20), allowNull: true, unique: true },
    nis: { type: DataTypes.STRING(20), allowNull: true },
    no_induk: { type: DataTypes.STRING(20), allowNull: true },
    tempat_lahir: { type: DataTypes.STRING(100), allowNull: true },
    tanggal_lahir: { type: DataTypes.DATEONLY, allowNull: true },
    alamat: { type: DataTypes.TEXT, allowNull: true },
    jenis_kelamin: { type: DataTypes.STRING(1), allowNull: true },
  },
  { sequelize, tableName: 'siswa', timestamps: false }
);

export default Siswa;
