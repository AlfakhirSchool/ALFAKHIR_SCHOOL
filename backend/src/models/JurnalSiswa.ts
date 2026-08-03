import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface JurnalSiswaAttributes {
  id: string;
  jurnal_id: string;
  siswa_id: string;
  kehadiran: 'hadir' | 'sakit' | 'izin' | 'alfa';
  catatan: string | null;
  created_at?: Date;
  updated_at?: Date;
}

interface JurnalSiswaCreation extends Optional<JurnalSiswaAttributes, 'id' | 'catatan'> {}

class JurnalSiswa extends Model<JurnalSiswaAttributes, JurnalSiswaCreation> implements JurnalSiswaAttributes {
  declare id: string;
  declare jurnal_id: string;
  declare siswa_id: string;
  declare kehadiran: 'hadir' | 'sakit' | 'izin' | 'alfa';
  declare catatan: string | null;
}

JurnalSiswa.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    jurnal_id: { type: DataTypes.UUID, allowNull: false },
    siswa_id: { type: DataTypes.UUID, allowNull: false },
    kehadiran: { type: DataTypes.ENUM('hadir', 'sakit', 'izin', 'alfa'), defaultValue: 'hadir', allowNull: false },
    catatan: { type: DataTypes.TEXT, allowNull: true },
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
