import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface JurnalSiswaAttributes {
  id: string;
  jurnal_id: string;
  siswa_id: string;
  kehadiran: 'hadir' | 'sakit' | 'izin' | 'alfa';
  partisipasi: string | null;
  pemahaman_materi: string | null;
  sikap_perilaku: string | null;
  catatan: string | null;
  foto_url: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface JurnalSiswaCreation extends Optional<JurnalSiswaAttributes, 'id' | 'catatan' | 'foto_url' | 'partisipasi' | 'pemahaman_materi' | 'sikap_perilaku'> {}

class JurnalSiswa extends Model<JurnalSiswaAttributes, JurnalSiswaCreation> implements JurnalSiswaAttributes {
  declare id: string;
  declare jurnal_id: string;
  declare siswa_id: string;
  declare kehadiran: 'hadir' | 'sakit' | 'izin' | 'alfa';
  declare partisipasi: string | null;
  declare pemahaman_materi: string | null;
  declare sikap_perilaku: string | null;
  declare catatan: string | null;
  declare foto_url: string | null;
}

JurnalSiswa.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    jurnal_id: { type: DataTypes.UUID, allowNull: false },
    siswa_id: { type: DataTypes.UUID, allowNull: false },
    kehadiran: { type: DataTypes.ENUM('hadir', 'sakit', 'izin', 'alfa'), defaultValue: 'hadir', allowNull: false },
    partisipasi: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'baik' },
    pemahaman_materi: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'baik' },
    sikap_perilaku: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'baik' },
    catatan: { type: DataTypes.TEXT, allowNull: true },
    foto_url: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    sequelize,
    tableName: 'jurnal_siswa',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default JurnalSiswa;
