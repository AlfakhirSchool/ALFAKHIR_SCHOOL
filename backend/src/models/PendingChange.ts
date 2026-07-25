import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PendingChangeAttributes {
  id: string;
  user_id: string;
  type: 'password' | 'nama';
  new_value: string;
  current_password_hash: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  catatan: string | null;
  created_at: Date;
  reviewed_at: Date | null;
}

interface PendingChangeCreation extends Optional<PendingChangeAttributes, 'id' | 'current_password_hash' | 'status' | 'reviewed_by' | 'catatan' | 'created_at' | 'reviewed_at'> {}

class PendingChange extends Model<PendingChangeAttributes, PendingChangeCreation> implements PendingChangeAttributes {
  declare id: string;
  declare user_id: string;
  declare type: 'password' | 'nama';
  declare new_value: string;
  declare current_password_hash: string | null;
  declare status: 'pending' | 'approved' | 'rejected';
  declare reviewed_by: string | null;
  declare catatan: string | null;
  declare created_at: Date;
  declare reviewed_at: Date | null;
}

PendingChange.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
    type: { type: DataTypes.STRING(20), allowNull: false },
    new_value: { type: DataTypes.TEXT, allowNull: false },
    current_password_hash: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'pending' },
    reviewed_by: { type: DataTypes.UUID, allowNull: true },
    catatan: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'pending_changes', timestamps: false }
);

export default PendingChange;
