import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AgendaPiketAttributes {
  id: string;
  guru_id: string;
  sekolah_id: string | null;
  tanggal: Date;
  keadaan_kbm: string | null;
  siswa_terlambat: object;
  guru_tidak_masuk: object;
  catatan: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface AgendaPiketCreationAttributes extends Optional<AgendaPiketAttributes, 'id' | 'sekolah_id' | 'keadaan_kbm' | 'siswa_terlambat' | 'guru_tidak_masuk' | 'catatan'> {}

class AgendaPiket extends Model<AgendaPiketAttributes, AgendaPiketCreationAttributes> implements AgendaPiketAttributes {
  declare id: string;
  declare guru_id: string;
  declare sekolah_id: string | null;
  declare tanggal: Date;
  declare keadaan_kbm: string | null;
  declare siswa_terlambat: object;
  declare guru_tidak_masuk: object;
  declare catatan: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

AgendaPiket.init(
  {
    id:               { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    guru_id:          { type: DataTypes.UUID, allowNull: false, references: { model: 'guru', key: 'id' } },
    sekolah_id:       { type: DataTypes.UUID, allowNull: true, references: { model: 'sekolah', key: 'id' } },
    tanggal:          { type: DataTypes.DATEONLY, allowNull: false },
    keadaan_kbm:      { type: DataTypes.TEXT, allowNull: true },
    siswa_terlambat:  { type: DataTypes.JSONB, defaultValue: [] },
    guru_tidak_masuk: { type: DataTypes.JSONB, defaultValue: [] },
    catatan:          { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: 'agenda_piket',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default AgendaPiket;
