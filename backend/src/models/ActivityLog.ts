import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ActivityLogAttributes {
  id: string;
  user_id: string | null;
  nama: string | null;
  role: string | null;
  school_level: string | null;
  app_source: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_value: object | null;
  new_value: object | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at?: Date;
}

interface ActivityLogCreationAttributes extends Optional<
  ActivityLogAttributes,
  'id' | 'user_id' | 'nama' | 'role' | 'school_level' | 'app_source' |
  'table_name' | 'record_id' | 'old_value' | 'new_value' | 'ip_address' | 'user_agent'
> {}

class ActivityLog extends Model<ActivityLogAttributes, ActivityLogCreationAttributes> implements ActivityLogAttributes {
  declare id: string;
  declare user_id: string | null;
  declare nama: string | null;
  declare role: string | null;
  declare school_level: string | null;
  declare app_source: string | null;
  declare action: string;
  declare table_name: string | null;
  declare record_id: string | null;
  declare old_value: object | null;
  declare new_value: object | null;
  declare ip_address: string | null;
  declare user_agent: string | null;
  declare readonly created_at: Date;
}

ActivityLog.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: true },
    nama: { type: DataTypes.STRING(255), allowNull: true },
    role: { type: DataTypes.STRING(20), allowNull: true },
    school_level: { type: DataTypes.STRING(3), allowNull: true },
    app_source: { type: DataTypes.STRING(30), allowNull: true },
    action: { type: DataTypes.STRING(150), allowNull: false },
    table_name: { type: DataTypes.STRING(100), allowNull: true },
    record_id: { type: DataTypes.UUID, allowNull: true },
    old_value: { type: DataTypes.JSONB, allowNull: true },
    new_value: { type: DataTypes.JSONB, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    user_agent: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: 'activity_log',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at',
  }
);

export default ActivityLog;
