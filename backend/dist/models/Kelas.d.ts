import { Model, Optional } from 'sequelize';
interface KelasAttributes {
    id: string;
    sekolah_id: string;
    nama: string;
    tingkat: number;
    wali_kelas_id: string | null;
    tahun_ajaran: string;
}
interface KelasCreationAttributes extends Optional<KelasAttributes, 'id' | 'wali_kelas_id'> {
}
declare class Kelas extends Model<KelasAttributes, KelasCreationAttributes> implements KelasAttributes {
    id: string;
    sekolah_id: string;
    nama: string;
    tingkat: number;
    wali_kelas_id: string | null;
    tahun_ajaran: string;
}
export default Kelas;
