import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type StatusJurnal = 'draft' | 'submitted' | 'reviewed' | 'approved';

interface JurnalGuruAttributes {
  id: string;
  guru_id: string;
  wali_kelas_id: string | null;
  kelas_id: string;
  mata_pelajaran_id: string;
  tanggal: Date;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  topik_pelajaran: string;
  metode_pembelajaran: string | null;
  deskripsi_pembelajaran: string | null;
  hasil_pembelajaran: string | null;
  hambatan_pembelajaran: string | null;
  rencana_tindak_lanjut: string | null;
  media_pembelajaran: string | null;
  sumber_belajar: string | null;
  jumlah_siswa_hadir: number;
  jumlah_siswa_sakit: number;
  jumlah_siswa_izin: number;
  jumlah_siswa_alfa: number;
  ttd_guru: string | null;
  signed_at: Date | null;
  ttd_wali_kelas: string | null;
  wali_kelas_signed_at: Date | null;
  status: StatusJurnal;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

interface JurnalGuruCreationAttributes extends Optional<JurnalGuruAttributes, 'id' | 'wali_kelas_id' | 'metode_pembelajaran' | 'deskripsi_pembelajaran' | 'hasil_pembelajaran' | 'hambatan_pembelajaran' | 'rencana_tindak_lanjut' | 'media_pembelajaran' | 'sumber_belajar' | 'ttd_guru' | 'signed_at' | 'ttd_wali_kelas' | 'wali_kelas_signed_at' | 'status' | 'deleted_at'> {}

class JurnalGuru extends Model<JurnalGuruAttributes, JurnalGuruCreationAttributes> implements JurnalGuruAttributes {
  declare id: string;
  declare guru_id: string;
  declare wali_kelas_id: string | null;
  declare kelas_id: string;
  declare mata_pelajaran_id: string;
  declare tanggal: Date;
  declare hari: string;
  declare jam_mulai: string;
  declare jam_selesai: string;
  declare topik_pelajaran: string;
  declare metode_pembelajaran: string | null;
  declare deskripsi_pembelajaran: string | null;
  declare hasil_pembelajaran: string | null;
  declare hambatan_pembelajaran: string | null;
  declare rencana_tindak_lanjut: string | null;
  declare media_pembelajaran: string | null;
  declare sumber_belajar: string | null;
  declare jumlah_siswa_hadir: number;
  declare jumlah_siswa_sakit: number;
  declare jumlah_siswa_izin: number;
  declare jumlah_siswa_alfa: number;
  declare ttd_guru: string | null;
  declare signed_at: Date | null;
  declare ttd_wali_kelas: string | null;
  declare wali_kelas_signed_at: Date | null;
  declare status: StatusJurnal;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
  declare deleted_at: Date | null;
}

JurnalGuru.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    guru_id: { type: DataTypes.UUID, allowNull: false },
    wali_kelas_id: { type: DataTypes.UUID, allowNull: true },
    kelas_id: { type: DataTypes.UUID, allowNull: false },
    mata_pelajaran_id: { type: DataTypes.UUID, allowNull: false },
    tanggal: { type: DataTypes.DATEONLY, allowNull: false },
    hari: { type: DataTypes.STRING(10), allowNull: false },
    jam_mulai: { type: DataTypes.TIME, allowNull: false },
    jam_selesai: { type: DataTypes.TIME, allowNull: false },
    topik_pelajaran: { type: DataTypes.STRING(500), allowNull: false },
    metode_pembelajaran: { type: DataTypes.TEXT, allowNull: true },
    deskripsi_pembelajaran: { type: DataTypes.TEXT, allowNull: true },
    hasil_pembelajaran: { type: DataTypes.TEXT, allowNull: true },
    hambatan_pembelajaran: { type: DataTypes.TEXT, allowNull: true },
    rencana_tindak_lanjut: { type: DataTypes.TEXT, allowNull: true },
    media_pembelajaran: { type: DataTypes.TEXT, allowNull: true },
    sumber_belajar: { type: DataTypes.TEXT, allowNull: true },
    jumlah_siswa_hadir: { type: DataTypes.INTEGER, defaultValue: 0 },
    jumlah_siswa_sakit: { type: DataTypes.INTEGER, defaultValue: 0 },
    jumlah_siswa_izin: { type: DataTypes.INTEGER, defaultValue: 0 },
    jumlah_siswa_alfa: { type: DataTypes.INTEGER, defaultValue: 0 },
    ttd_guru: { type: DataTypes.TEXT, allowNull: true },
    signed_at: { type: DataTypes.DATE, allowNull: true },
    ttd_wali_kelas: { type: DataTypes.TEXT, allowNull: true },
    wali_kelas_signed_at: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM('draft', 'submitted', 'reviewed', 'approved'), defaultValue: 'draft' },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'jurnal_guru',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at',
  }
);

export default JurnalGuru;
