import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface KelasAttributes {
  id: string;
  sekolah_id: string;
  nama: string;
  tingkat: number;
  wali_kelas_id: string | null;
  tahun_ajaran: string;
}

interface KelasCreationAttributes extends Optional<KelasAttributes, 'id' | 'wali_kelas_id'> {}

class Kelas extends Model<KelasAttributes, KelasCreationAttributes> implements KelasAttributes {
  declare id: string;
  declare sekolah_id: string;
  declare nama: string;
  declare tingkat: number;
  declare wali_kelas_id: string | null;
  declare tahun_ajaran: string;
}

Kelas.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    sekolah_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'sekolah', key: 'id' } },
    nama: { type: DataTypes.STRING(100), allowNull: false },
    tingkat: { type: DataTypes.INTEGER, allowNull: false },
    wali_kelas_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'guru', key: 'id' } },
    tahun_ajaran: { type: DataTypes.STRING(20), allowNull: false },
  },
  { sequelize, tableName: 'kelas', timestamps: false }
);

export default Kelas;
