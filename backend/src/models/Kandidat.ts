import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface KandidatAttributes {
  id: string;
  nama: string;
  nama_diperbaiki: string | null;
  level: 'SD' | 'SMP' | 'SMA';
  status: 'PENDING' | 'REVIEW' | 'DITERIMA' | 'DITOLAK';
  tahun_ajaran: string;
  nama_ortu: string | null;
  no_telp_ortu: string | null;
  email_ortu: string | null;
  email_siswa: string | null;
  asal_sekolah: string | null;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;
  catatan: string | null;
  ruangan: string | null;
  pewawancara_id: string | null;
  pewawancara_nama: string | null;
  skor_akademik: number | null;
  rekomendasi: string | null;
  siswa_id: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface KandidatCreationAttributes extends Optional<KandidatAttributes,
  'id' | 'status' | 'nama_diperbaiki' | 'nama_ortu' | 'no_telp_ortu' | 'email_ortu' | 'email_siswa' |
  'asal_sekolah' | 'jenis_kelamin' | 'tanggal_lahir' | 'catatan' | 'ruangan' |
  'pewawancara_id' | 'pewawancara_nama' | 'skor_akademik' | 'rekomendasi' | 'siswa_id'
> {}

class Kandidat extends Model<KandidatAttributes, KandidatCreationAttributes> implements KandidatAttributes {
  declare id: string;
  declare nama: string;
  declare nama_diperbaiki: string | null;
  declare level: 'SD' | 'SMP' | 'SMA';
  declare status: 'PENDING' | 'REVIEW' | 'DITERIMA' | 'DITOLAK';
  declare tahun_ajaran: string;
  declare nama_ortu: string | null;
  declare no_telp_ortu: string | null;
  declare email_ortu: string | null;
  declare email_siswa: string | null;
  declare asal_sekolah: string | null;
  declare jenis_kelamin: string | null;
  declare tanggal_lahir: string | null;
  declare catatan: string | null;
  declare ruangan: string | null;
  declare pewawancara_id: string | null;
  declare pewawancara_nama: string | null;
  declare skor_akademik: number | null;
  declare rekomendasi: string | null;
  declare siswa_id: string | null;
}

Kandidat.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    nama: { type: DataTypes.STRING(150), allowNull: false },
    nama_diperbaiki: { type: DataTypes.STRING(150), allowNull: true },
    level: { type: DataTypes.ENUM('SD', 'SMP', 'SMA'), allowNull: false },
    status: { type: DataTypes.ENUM('PENDING', 'REVIEW', 'DITERIMA', 'DITOLAK'), allowNull: false, defaultValue: 'PENDING' },
    tahun_ajaran: { type: DataTypes.STRING(20), allowNull: false },
    nama_ortu: { type: DataTypes.STRING(150), allowNull: true },
    no_telp_ortu: { type: DataTypes.STRING(20), allowNull: true },
    email_ortu: { type: DataTypes.STRING(150), allowNull: true },
    email_siswa: { type: DataTypes.STRING(150), allowNull: true },
    asal_sekolah: { type: DataTypes.STRING(150), allowNull: true },
    jenis_kelamin: { type: DataTypes.STRING(10), allowNull: true },
    tanggal_lahir: { type: DataTypes.DATEONLY, allowNull: true },
    catatan: { type: DataTypes.TEXT, allowNull: true },
    ruangan: { type: DataTypes.STRING(50), allowNull: true },
    pewawancara_id: { type: DataTypes.UUID, allowNull: true },
    pewawancara_nama: { type: DataTypes.STRING(150), allowNull: true },
    skor_akademik: { type: DataTypes.FLOAT, allowNull: true },
    rekomendasi: { type: DataTypes.STRING(50), allowNull: true },
    siswa_id: { type: DataTypes.UUID, allowNull: true },
  },
  {
    sequelize,
    tableName: 'kandidat',
    modelName: 'Kandidat',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default Kandidat;
