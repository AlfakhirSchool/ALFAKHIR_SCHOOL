import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface RingkasanAIAttributes {
  id: string;
  kandidat_id: string;
  ringkasan: string;
  created_at?: Date;
  updated_at?: Date;
}

interface RingkasanAICreationAttributes extends Optional<RingkasanAIAttributes, 'id'> {}

class RingkasanAI extends Model<RingkasanAIAttributes, RingkasanAICreationAttributes>
  implements RingkasanAIAttributes {
  declare id: string;
  declare kandidat_id: string;
  declare ringkasan: string;
}

RingkasanAI.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    kandidat_id: { type: DataTypes.UUID, allowNull: false, unique: true },
    ringkasan: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    sequelize,
    tableName: 'ringkasan_ai',
    modelName: 'RingkasanAI',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default RingkasanAI;
