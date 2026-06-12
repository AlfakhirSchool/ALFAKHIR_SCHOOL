import { Model, Optional } from 'sequelize';
interface MataPelajaranAttributes {
    id: string;
    nama: string;
    kode: string;
    kkm: number;
}
interface MataPelajaranCreationAttributes extends Optional<MataPelajaranAttributes, 'id'> {
}
declare class MataPelajaran extends Model<MataPelajaranAttributes, MataPelajaranCreationAttributes> implements MataPelajaranAttributes {
    id: string;
    nama: string;
    kode: string;
    kkm: number;
}
export default MataPelajaran;
