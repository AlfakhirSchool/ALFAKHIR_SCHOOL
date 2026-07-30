import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface HasilTesAkademikAttributes {
  id: string;
  kandidat_id: string;
  total_skor: number;
  skor_per_mapel: string; // JSON
  created_at?: Date;
  updated_at?: Date;
}

interface HasilTesAkademikCreationAttributes extends Optional<HasilTesAkademikAttributes, 'id'> {}

class HasilTesAkademik extends Model<HasilTesAkademikAttributes, HasilTesAkademikCreationAttributes>
  implements HasilTesAkademikAttributes {
  declare id: string;
  declare kandidat_id: string;
  declare total_skor: number;
  declare skor_per_mapel: string;
}

HasilTesAkademik.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    kandidat_id: { type: DataTypes.UUID, allowNull: false, unique: true },
    total_skor: { type: DataTypes.FLOAT, allowNull: false },
    skor_per_mapel: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    sequelize,
    tableName: 'hasil_tes_akademik',
    modelName: 'HasilTesAkademik',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default HasilTesAkademik;
