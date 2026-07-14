import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type StatusAbsensi = 'hadir' | 'sakit' | 'izin' | 'alfa';

interface AbsensiAttributes {
  id: string;
  siswa_id: string;
  jadwal_pelajaran_id: string;
  tanggal: Date;
  waktu_hadir: Date | null;
  status: StatusAbsensi;
  qr_code_scanned: boolean;
  input_code: string | null;
  catatan: string | null;
  latitude: number | null;
  longitude: number | null;
  created_by: string;
  created_at?: Date;
}

interface AbsensiCreationAttributes extends Optional<AbsensiAttributes, 'id' | 'waktu_hadir' | 'qr_code_scanned' | 'input_code' | 'catatan' | 'latitude' | 'longitude'> {}

class Absensi extends Model<AbsensiAttributes, AbsensiCreationAttributes> implements AbsensiAttributes {
  declare id: string;
  declare siswa_id: string;
  declare jadwal_pelajaran_id: string;
  declare tanggal: Date;
  declare waktu_hadir: Date | null;
  declare status: StatusAbsensi;
  declare qr_code_scanned: boolean;
  declare input_code: string | null;
  declare catatan: string | null;
  declare latitude: number | null;
  declare longitude: number | null;
  declare created_by: string;
  declare readonly created_at: Date;
}

Absensi.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    siswa_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    jadwal_pelajaran_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'jadwal_pelajaran', key: 'id' } },
    tanggal: { type: DataTypes.DATEONLY, allowNull: false },
    waktu_hadir: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM('hadir', 'sakit', 'izin', 'alfa'), allowNull: false },
    qr_code_scanned: { type: DataTypes.BOOLEAN, defaultValue: false },
    input_code: { type: DataTypes.STRING(6), allowNull: true },
    catatan: { type: DataTypes.TEXT, allowNull: true },
    latitude: { type: DataTypes.DOUBLE, allowNull: true },
    longitude: { type: DataTypes.DOUBLE, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
  },
  {
    sequelize,
    tableName: 'absensi',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at',
  }
);

export default Absensi;
