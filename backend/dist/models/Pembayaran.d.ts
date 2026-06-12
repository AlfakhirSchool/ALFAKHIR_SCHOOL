import { Model, Optional } from 'sequelize';
export type StatusPembayaran = 'belum_bayar' | 'sebagian' | 'lunas';
export type VaBank = 'bca' | 'mandiri';
interface PembayaranAttributes {
    id: string;
    siswa_id: string;
    tahun_ajaran: string;
    jenis_biaya: string;
    nominal_biaya: number;
    nominal_terbayar: number;
    status: StatusPembayaran;
    virtual_account: string | null;
    va_bank: VaBank | null;
    tanggal_jatuh_tempo: Date | null;
    tanggal_bayar: Date | null;
    metode_bayar: string | null;
    bukti_bayar: string | null;
    created_at?: Date;
    updated_at?: Date;
}
interface PembayaranCreationAttributes extends Optional<PembayaranAttributes, 'id' | 'nominal_terbayar' | 'status' | 'virtual_account' | 'va_bank' | 'tanggal_jatuh_tempo' | 'tanggal_bayar' | 'metode_bayar' | 'bukti_bayar'> {
}
declare class Pembayaran extends Model<PembayaranAttributes, PembayaranCreationAttributes> implements PembayaranAttributes {
    id: string;
    siswa_id: string;
    tahun_ajaran: string;
    jenis_biaya: string;
    nominal_biaya: number;
    nominal_terbayar: number;
    status: StatusPembayaran;
    virtual_account: string | null;
    va_bank: VaBank | null;
    tanggal_jatuh_tempo: Date | null;
    tanggal_bayar: Date | null;
    metode_bayar: string | null;
    bukti_bayar: string | null;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default Pembayaran;
