import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

export type UserRole = 'admin' | 'guru' | 'pewawancara' | 'keuangan' | 'siswa' | 'ortu';
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

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'is_active' | 'profile_pic' | 'school_level' | 'device_id'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email: string;
  declare password_hash: string;
  declare nama: string;
  declare role: UserRole;
  declare school_level: SchoolLevel;
  declare is_active: boolean;
  declare profile_pic: string | null;
  declare device_id: string | null;
  declare readonly created_at: Date;
  declare readonly updated_at: Date;
}

User.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    nama: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'guru', 'pewawancara', 'keuangan', 'siswa', 'ortu'), allowNull: false },
    school_level: { type: DataTypes.ENUM('SD', 'SMP', 'SMA'), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    profile_pic: { type: DataTypes.STRING(500), allowNull: true },
    device_id: { type: DataTypes.STRING(255), allowNull: true },
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
