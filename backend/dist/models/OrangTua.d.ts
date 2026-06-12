import { Model, Optional } from 'sequelize';
interface OrangTuaAttributes {
    id: string;
    user_id: string;
    siswa_id: string;
    hubungan: string;
    no_telp: string | null;
}
interface OrangTuaCreationAttributes extends Optional<OrangTuaAttributes, 'id' | 'no_telp'> {
}
declare class OrangTua extends Model<OrangTuaAttributes, OrangTuaCreationAttributes> implements OrangTuaAttributes {
    id: string;
    user_id: string;
    siswa_id: string;
    hubungan: string;
    no_telp: string | null;
}
export default OrangTua;
