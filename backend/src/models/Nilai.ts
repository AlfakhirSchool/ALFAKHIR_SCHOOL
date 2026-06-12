import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface NilaiAttributes {
  id: string;
  siswa_id: string;
  mata_pelajaran_id: string;
  guru_id: string;
  semester: number;
  tahun_ajaran: string;
  kuis: number | null;
  tugas: number | null;
  uts: number | null;
  uas: number | null;
  nilai_akhir: number | null;
  grade: string | null;
  predikat: string | null;
  catatan: string | null;
  input_date: Date | null;
  update_date: Date | null;
}

interface NilaiCreationAttributes extends Optional<NilaiAttributes, 'id' | 'kuis' | 'tugas' | 'uts' | 'uas' | 'nilai_akhir' | 'grade' | 'predikat' | 'catatan' | 'input_date' | 'update_date'> {}

export function hitungNilaiAkhir(kuis: number, tugas: number, uts: number, uas: number): number {
  return Math.round(kuis * 0.1 + tugas * 0.15 + uts * 0.25 + uas * 0.5);
}

export function hitungGrade(nilai: number): { grade: string; predikat: string } {
  if (nilai >= 85) return { grade: 'A', predikat: 'Sangat Baik' };
  if (nilai >= 75) return { grade: 'B', predikat: 'Baik' };
  if (nilai >= 65) return { grade: 'C', predikat: 'Cukup' };
  if (nilai >= 55) return { grade: 'D', predikat: 'Kurang' };
  return { grade: 'E', predikat: 'Sangat Kurang' };
}

class Nilai extends Model<NilaiAttributes, NilaiCreationAttributes> implements NilaiAttributes {
  declare id: string;
  declare siswa_id: string;
  declare mata_pelajaran_id: string;
  declare guru_id: string;
  declare semester: number;
  declare tahun_ajaran: string;
  declare kuis: number | null;
  declare tugas: number | null;
  declare uts: number | null;
  declare uas: number | null;
  declare nilai_akhir: number | null;
  declare grade: string | null;
  declare predikat: string | null;
  declare catatan: string | null;
  declare input_date: Date | null;
  declare update_date: Date | null;
}

Nilai.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    siswa_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    mata_pelajaran_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'mata_pelajaran', key: 'id' } },
    guru_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'guru', key: 'id' } },
    semester: { type: DataTypes.INTEGER, allowNull: false },
    tahun_ajaran: { type: DataTypes.STRING(20), allowNull: false },
    kuis: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    tugas: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    uts: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    uas: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    nilai_akhir: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    grade: { type: DataTypes.STRING(2), allowNull: true },
    predikat: { type: DataTypes.STRING(30), allowNull: true },
    catatan: { type: DataTypes.TEXT, allowNull: true },
    input_date: { type: DataTypes.DATE, allowNull: true },
    update_date: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'nilai',
    timestamps: false,
    indexes: [{ unique: true, fields: ['siswa_id', 'mata_pelajaran_id', 'semester', 'tahun_ajaran'] }],
  }
);

export default Nilai;
