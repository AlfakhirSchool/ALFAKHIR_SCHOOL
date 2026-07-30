import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface JawabanFormAttributes {
  id: string;
  kandidat_id: string;
  role: 'ortu' | 'siswa';
  jawaban: object;
  created_at?: Date;
  updated_at?: Date;
}

interface JawabanFormCreationAttributes extends Optional<JawabanFormAttributes, 'id'> {}

class JawabanForm extends Model<JawabanFormAttributes, JawabanFormCreationAttributes>
  implements JawabanFormAttributes {
  declare id: string;
  declare kandidat_id: string;
  declare role: 'ortu' | 'siswa';
  declare jawaban: object;
}

JawabanForm.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    kandidat_id: { type: DataTypes.UUID, allowNull: false },
    role: { type: DataTypes.ENUM('ortu', 'siswa'), allowNull: false },
    jawaban: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  },
  {
    sequelize,
    tableName: 'jawaban_form',
    modelName: 'JawabanForm',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default JawabanForm;
