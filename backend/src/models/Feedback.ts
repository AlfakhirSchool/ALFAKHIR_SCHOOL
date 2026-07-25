import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index';

export class Feedback extends Model {}

Feedback.init({
  id:          { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user_id:     { type: DataTypes.UUID, allowNull: true },
  kategori:    { type: DataTypes.STRING(50), allowNull: false },
  judul:       { type: DataTypes.STRING(200), allowNull: false },
  pesan:       { type: DataTypes.TEXT, allowNull: false },
  sumber:      { type: DataTypes.STRING(20), defaultValue: 'web' },
  status:      { type: DataTypes.STRING(20), defaultValue: 'baru' },
  balasan:     { type: DataTypes.TEXT },
  dibalas_at:  { type: DataTypes.DATE },
  created_at:  { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  tableName: 'feedback',
  timestamps: false,
});
