import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface JadwalPelajaranAttributes {
  id: string;
  kelas_id: string;
  guru_id: string;
  mata_pelajaran_id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  ruangan: string | null;
}

interface JadwalPelajaranCreationAttributes extends Optional<JadwalPelajaranAttributes, 'id' | 'ruangan'> {}

class JadwalPelajaran extends Model<JadwalPelajaranAttributes, JadwalPelajaranCreationAttributes> implements JadwalPelajaranAttributes {
  declare id: string;
  declare kelas_id: string;
  declare guru_id: string;
  declare mata_pelajaran_id: string;
  declare hari: string;
  declare jam_mulai: string;
  declare jam_selesai: string;
  declare ruangan: string | null;
}

JadwalPelajaran.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    kelas_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'kelas', key: 'id' } },
    guru_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'guru', key: 'id' } },
    mata_pelajaran_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'mata_pelajaran', key: 'id' } },
    hari: {
      type: DataTypes.ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'),
      allowNull: false,
    },
    jam_mulai: { type: DataTypes.TIME, allowNull: false },
    jam_selesai: { type: DataTypes.TIME, allowNull: false },
    ruangan: { type: DataTypes.STRING(50), allowNull: true },
  },
  { sequelize, tableName: 'jadwal_pelajaran', timestamps: false }
);

export default JadwalPelajaran;
