import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type JenisTugas = 'tugas' | 'proyek' | 'ulangan_harian';

interface TugasAttributes {
  id: string;
  judul: string;
  jenis: JenisTugas;
  deskripsi: string | null;
  kelas_id: string;
  mata_pelajaran_id: string | null;
  guru_id: string;
  tgl_diberikan: Date;
  deadline: Date;
  file_url: string | null;
  file_name: string | null;
  max_nilai: number;
  created_at?: Date;
  updated_at?: Date;
}

interface TugasCreationAttributes extends Optional<TugasAttributes, 'id' | 'jenis' | 'deskripsi' | 'mata_pelajaran_id' | 'tgl_diberikan' | 'file_url' | 'file_name' | 'max_nilai'> {}

class Tugas extends Model<TugasAttributes, TugasCreationAttributes> implements TugasAttributes {
  declare id: string;
  declare judul: string;
  declare jenis: JenisTugas;
  declare deskripsi: string | null;
  declare kelas_id: string;
  declare mata_pelajaran_id: string | null;
  declare guru_id: string;
  declare tgl_diberikan: Date;
  declare deadline: Date;
  declare file_url: string | null;
  declare file_name: string | null;
  declare max_nilai: number;
  declare created_at: Date;
  declare updated_at: Date;
}

Tugas.init(
  {
    id:                { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    judul:             { type: DataTypes.STRING(255), allowNull: false },
    jenis:             { type: DataTypes.ENUM('tugas', 'proyek', 'ulangan_harian'), allowNull: false, defaultValue: 'tugas' },
    deskripsi:         { type: DataTypes.TEXT, allowNull: true },
    kelas_id:          { type: DataTypes.UUID, allowNull: false, references: { model: 'kelas', key: 'id' } },
    mata_pelajaran_id: { type: DataTypes.UUID, allowNull: true, references: { model: 'mata_pelajaran', key: 'id' } },
    guru_id:           { type: DataTypes.UUID, allowNull: false, references: { model: 'guru', key: 'id' } },
    tgl_diberikan:     { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    deadline:          { type: DataTypes.DATE, allowNull: false },
    file_url:          { type: DataTypes.STRING(500), allowNull: true },
    file_name:         { type: DataTypes.STRING(255), allowNull: true },
    max_nilai:         { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
  },
  {
    sequelize,
    tableName: 'tugas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Tugas;
