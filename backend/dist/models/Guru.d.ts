import { Model, Optional } from 'sequelize';
interface GuruAttributes {
    id: string;
    user_id: string;
    nip: string | null;
    spesialisasi: string | null;
    no_telp: string | null;
}
interface GuruCreationAttributes extends Optional<GuruAttributes, 'id' | 'nip' | 'spesialisasi' | 'no_telp'> {
}
declare class Guru extends Model<GuruAttributes, GuruCreationAttributes> implements GuruAttributes {
    id: string;
    user_id: string;
    nip: string | null;
    spesialisasi: string | null;
    no_telp: string | null;
}
export default Guru;
