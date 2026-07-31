import { Model, Optional } from 'sequelize';
interface SiswaAttributes {
    id: string;
    user_id: string;
    kelas_id: string;
    nisn: string | null;
    nis: string | null;
    no_induk: string | null;
    tempat_lahir: string | null;
    tanggal_lahir: Date | null;
    alamat: string | null;
    jenis_kelamin: string | null;
}
interface SiswaCreationAttributes extends Optional<SiswaAttributes, 'id' | 'nisn' | 'nis' | 'no_induk' | 'tempat_lahir' | 'tanggal_lahir' | 'alamat' | 'jenis_kelamin'> {
}
declare class Siswa extends Model<SiswaAttributes, SiswaCreationAttributes> implements SiswaAttributes {
    id: string;
    user_id: string;
    kelas_id: string;
    nisn: string | null;
    nis: string | null;
    no_induk: string | null;
    tempat_lahir: string | null;
    tanggal_lahir: Date | null;
    alamat: string | null;
    jenis_kelamin: string | null;
}
export default Siswa;
