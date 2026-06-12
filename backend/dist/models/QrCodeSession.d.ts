import { Model, Optional } from 'sequelize';
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
interface QrCodeSessionCreationAttributes extends Optional<QrCodeSessionAttributes, 'id' | 'aktif' | 'waktu_selesai'> {
}
declare class QrCodeSession extends Model<QrCodeSessionAttributes, QrCodeSessionCreationAttributes> implements QrCodeSessionAttributes {
    id: string;
    jadwal_pelajaran_id: string;
    tanggal: Date;
    unique_code: string;
    qr_data: string;
    aktif: boolean;
    waktu_mulai: Date;
    waktu_selesai: Date | null;
}
export default QrCodeSession;
