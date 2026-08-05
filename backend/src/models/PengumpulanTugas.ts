import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PengumpulanTugasAttributes {
  id: string;
  tugas_id: string;
  siswa_id: string;
  file_url: string | null;
  file_name: string | null;
  catatan_siswa: string | null;
  nilai: number | null;
  catatan_guru: string | null;
  dinilai_at: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

interface PengumpulanTugasCreationAttributes extends Optional<PengumpulanTugasAttributes, 'id' | 'file_url' | 'file_name' | 'catatan_siswa' | 'nilai' | 'catatan_guru' | 'dinilai_at'> {}

class PengumpulanTugas extends Model<PengumpulanTugasAttributes, PengumpulanTugasCreationAttributes> implements PengumpulanTugasAttributes {
  declare id: string;
  declare tugas_id: string;
  declare siswa_id: string;
  declare file_url: string | null;
  declare file_name: string | null;
  declare catatan_siswa: string | null;
  declare nilai: number | null;
  declare catatan_guru: string | null;
  declare dinilai_at: Date | null;
  declare created_at: Date;
  declare updated_at: Date;
}

PengumpulanTugas.init(
  {
    id:            { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    tugas_id:      { type: DataTypes.UUID, allowNull: false, references: { model: 'tugas', key: 'id' } },
    siswa_id:      { type: DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    file_url:      { type: DataTypes.STRING(500), allowNull: true },
    file_name:     { type: DataTypes.STRING(255), allowNull: true },
    catatan_siswa: { type: DataTypes.TEXT, allowNull: true },
    nilai:         { type: DataTypes.INTEGER, allowNull: true },
    catatan_guru:  { type: DataTypes.TEXT, allowNull: true },
    dinilai_at:    { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'pengumpulan_tugas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default PengumpulanTugas;
