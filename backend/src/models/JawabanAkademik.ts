import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface JawabanAkademikAttributes {
  id: string;
  kandidat_id: string;
  soal_id: string;
  jawaban: string;
  benar: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface JawabanAkademikCreationAttributes extends Optional<JawabanAkademikAttributes, 'id'> {}

class JawabanAkademik extends Model<JawabanAkademikAttributes, JawabanAkademikCreationAttributes>
  implements JawabanAkademikAttributes {
  declare id: string;
  declare kandidat_id: string;
  declare soal_id: string;
  declare jawaban: string;
  declare benar: boolean;
}

JawabanAkademik.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    kandidat_id: { type: DataTypes.UUID, allowNull: false },
    soal_id: { type: DataTypes.UUID, allowNull: false },
    jawaban: { type: DataTypes.TEXT, allowNull: false },
    benar: { type: DataTypes.BOOLEAN, allowNull: false },
  },
  {
    sequelize,
    tableName: 'jawaban_akademik',
    modelName: 'JawabanAkademik',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ unique: true, fields: ['kandidat_id', 'soal_id'] }],
  }
);

export default JawabanAkademik;
