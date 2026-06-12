import { Model, Optional } from 'sequelize';
interface RaporAttributes {
    id: string;
    siswa_id: string;
    semester: number;
    tahun_ajaran: string;
    jumlah_hadir: number;
    jumlah_sakit: number;
    jumlah_izin: number;
    jumlah_alfa: number;
    nilai_rata_rata: number | null;
    ranking: number | null;
    pdf_file: string | null;
    generated_at: Date | null;
}
interface RaporCreationAttributes extends Optional<RaporAttributes, 'id' | 'nilai_rata_rata' | 'ranking' | 'pdf_file' | 'generated_at'> {
}
declare class Rapor extends Model<RaporAttributes, RaporCreationAttributes> implements RaporAttributes {
    id: string;
    siswa_id: string;
    semester: number;
    tahun_ajaran: string;
    jumlah_hadir: number;
    jumlah_sakit: number;
    jumlah_izin: number;
    jumlah_alfa: number;
    nilai_rata_rata: number | null;
    ranking: number | null;
    pdf_file: string | null;
    generated_at: Date | null;
}
export default Rapor;
