import { Model, Optional } from 'sequelize';
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
    created_by: string;
    created_at?: Date;
}
interface AbsensiCreationAttributes extends Optional<AbsensiAttributes, 'id' | 'waktu_hadir' | 'qr_code_scanned' | 'input_code' | 'catatan'> {
}
declare class Absensi extends Model<AbsensiAttributes, AbsensiCreationAttributes> implements AbsensiAttributes {
    id: string;
    siswa_id: string;
    jadwal_pelajaran_id: string;
    tanggal: Date;
    waktu_hadir: Date | null;
    status: StatusAbsensi;
    qr_code_scanned: boolean;
    input_code: string | null;
    catatan: string | null;
    created_by: string;
    readonly created_at: Date;
}
export default Absensi;
