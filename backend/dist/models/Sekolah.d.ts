import { Model, Optional } from 'sequelize';
export type JenjangLevel = 'SD' | 'SMP' | 'SMA';
interface SekolahAttributes {
    id: string;
    nama: string;
    level: JenjangLevel;
}
interface SekolahCreationAttributes extends Optional<SekolahAttributes, 'id'> {
}
declare class Sekolah extends Model<SekolahAttributes, SekolahCreationAttributes> implements SekolahAttributes {
    id: string;
    nama: string;
    level: JenjangLevel;
}
export default Sekolah;
