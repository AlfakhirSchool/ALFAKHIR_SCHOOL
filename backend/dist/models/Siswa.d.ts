import { Model, Optional } from 'sequelize';
interface SiswaAttributes {
    id: string;
    user_id: string;
    kelas_id: string;
    nisn: string;
    nis: string;
    no_induk: string;
    tempat_lahir: string | null;
    tanggal_lahir: Date | null;
    alamat: string | null;
}
interface SiswaCreationAttributes extends Optional<SiswaAttributes, 'id' | 'tempat_lahir' | 'tanggal_lahir' | 'alamat'> {
}
declare class Siswa extends Model<SiswaAttributes, SiswaCreationAttributes> implements SiswaAttributes {
    id: string;
    user_id: string;
    kelas_id: string;
    nisn: string;
    nis: string;
    no_induk: string;
    tempat_lahir: string | null;
    tanggal_lahir: Date | null;
    alamat: string | null;
}
export default Siswa;
