import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface QrCodeSessionAttributes {
  id: string;
  jadwal_pelajaran_id: string;
  tanggal: Date;
  unique_code: string;
  qr_data: string;
  aktif: boolean;
  waktu_mulai: Date;
  waktu_selesai: Date | null;
}

interface QrCodeSessionCreationAttributes extends Optional<QrCodeSessionAttributes, 'id' | 'aktif' | 'waktu_selesai'> {}

class QrCodeSession extends Model<QrCodeSessionAttributes, QrCodeSessionCreationAttributes> implements QrCodeSessionAttributes {
  declare id: string;
  declare jadwal_pelajaran_id: string;
  declare tanggal: Date;
  declare unique_code: string;
  declare qr_data: string;
  declare aktif: boolean;
  declare waktu_mulai: Date;
  declare waktu_selesai: Date | null;
}

QrCodeSession.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    jadwal_pelajaran_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'jadwal_pelajaran', key: 'id' } },
    tanggal: { type: DataTypes.DATEONLY, allowNull: false },
    unique_code: { type: DataTypes.STRING(6), allowNull: false },
    qr_data: { type: DataTypes.TEXT, allowNull: false },
    aktif: { type: DataTypes.BOOLEAN, defaultValue: true },
    waktu_mulai: { type: DataTypes.DATE, allowNull: false },
    waktu_selesai: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'qr_code_session', timestamps: false }
);

export default QrCodeSession;
