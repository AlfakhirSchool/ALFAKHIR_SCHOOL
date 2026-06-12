import { Model, Optional } from 'sequelize';
export type UserRole = 'admin' | 'guru' | 'siswa' | 'ortu';
interface UserAttributes {
    id: string;
    email: string;
    password_hash: string;
    nama: string;
    role: UserRole;
    is_active: boolean;
    profile_pic: string | null;
    created_at?: Date;
    updated_at?: Date;
}
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'is_active' | 'profile_pic'> {
}
declare class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    id: string;
    email: string;
    password_hash: string;
    nama: string;
    role: UserRole;
    is_active: boolean;
    profile_pic: string | null;
    readonly created_at: Date;
    readonly updated_at: Date;
}
export default User;
