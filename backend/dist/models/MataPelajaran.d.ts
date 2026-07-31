import { Model, Optional } from 'sequelize';
interface MataPelajaranAttributes {
    id: string;
    nama: string;
    kode: string;
    kkm: number;
    jenjang: string | null;
    jam_pelajaran: number | null;
}
interface MataPelajaranCreationAttributes extends Optional<MataPelajaranAttributes, 'id' | 'jenjang' | 'jam_pelajaran'> {
}
declare class MataPelajaran extends Model<MataPelajaranAttributes, MataPelajaranCreationAttributes> implements MataPelajaranAttributes {
    id: string;
    nama: string;
    kode: string;
    kkm: number;
    jenjang: string | null;
    jam_pelajaran: number | null;
}
export default MataPelajaran;
