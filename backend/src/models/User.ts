import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

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

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'is_active' | 'profile_pic'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare password_hash: string;
  declare nama: string;
  declare role: UserRole;
  declare is_active: boolean;
  declare profile_pic: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    nama: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'guru', 'siswa', 'ortu'), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    profile_pic: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default User;
