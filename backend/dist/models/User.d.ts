import { Model, Optional } from 'sequelize';
export type UserRole = 'admin' | 'guru' | 'pewawancara' | 'siswa' | 'ortu';
export type SchoolLevel = 'SD' | 'SMP' | 'SMA' | null;
interface UserAttributes {
    id: string;
    email: string;
    password_hash: string;
    nama: string;
    role: UserRole;
    school_level: SchoolLevel;
    is_active: boolean;
    profile_pic: string | null;
    device_id: string | null;
    created_at?: Date;
    updated_at?: Date;
}
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'is_active' | 'profile_pic' | 'school_level' | 'device_id'> {
}
declare class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    id: string;
    email: string;
    password_hash: string;
    nama: string;
    role: UserRole;
    school_level: SchoolLevel;
    is_active: boolean;
    profile_pic: string | null;
    device_id: string | null;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default User;
