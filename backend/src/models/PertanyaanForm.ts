import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface PertanyaanFormAttributes {
  id: string;
  teks: string;
  tipe: string;
  role: string;
  level: string | null;
  urutan: number;
  options: string | null;
  is_system: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface PertanyaanFormCreationAttributes extends Optional<PertanyaanFormAttributes,
  'id' | 'level' | 'urutan' | 'options' | 'is_system'> {}

class PertanyaanForm extends Model<PertanyaanFormAttributes, PertanyaanFormCreationAttributes>
  implements PertanyaanFormAttributes {
  declare id: string;
  declare teks: string;
  declare tipe: string;
  declare role: string;
  declare level: string | null;
  declare urutan: number;
  declare options: string | null;
  declare is_system: boolean;
}

PertanyaanForm.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    teks: { type: DataTypes.TEXT, allowNull: false },
    tipe: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'text' },
    role: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'ortu' },
    level: { type: DataTypes.STRING(10), allowNull: true },
    urutan: { type: DataTypes.INTEGER, defaultValue: 0 },
    options: { type: DataTypes.TEXT, allowNull: true },
    is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    sequelize,
    tableName: 'pertanyaan_form',
    modelName: 'PertanyaanForm',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default PertanyaanForm;
