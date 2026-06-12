import { Model, Optional } from 'sequelize';
interface PembayaranDetailAttributes {
    id: string;
    pembayaran_id: string;
    nominal_bayar: number;
    tanggal_bayar: Date;
    bank: string | null;
    reference_number: string | null;
    created_at?: Date;
}
interface PembayaranDetailCreationAttributes extends Optional<PembayaranDetailAttributes, 'id' | 'bank' | 'reference_number'> {
}
declare class PembayaranDetail extends Model<PembayaranDetailAttributes, PembayaranDetailCreationAttributes> implements PembayaranDetailAttributes {
    id: string;
    pembayaran_id: string;
    nominal_bayar: number;
    tanggal_bayar: Date;
    bank: string | null;
    reference_number: string | null;
    readonly created_at: Date;
}
export default PembayaranDetail;
