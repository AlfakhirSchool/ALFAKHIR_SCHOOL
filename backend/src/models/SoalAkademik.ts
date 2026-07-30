import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SoalAkademikAttributes {
  id: string;
  teks: string;
  mata_pelajaran: string;
  gambar_url: string | null;
  pilihan: string; // JSON array
  jawaban_benar: string;
  urutan: number;
  level: 'SD' | 'SMP' | 'SMA' | null;
  created_at?: Date;
  updated_at?: Date;
}

interface SoalAkademikCreationAttributes extends Optional<SoalAkademikAttributes,
  'id' | 'gambar_url' | 'urutan' | 'level'
> {}

class SoalAkademik extends Model<SoalAkademikAttributes, SoalAkademikCreationAttributes>
  implements SoalAkademikAttributes {
  declare id: string;
  declare teks: string;
  declare mata_pelajaran: string;
  declare gambar_url: string | null;
  declare pilihan: string;
  declare jawaban_benar: string;
  declare urutan: number;
  declare level: 'SD' | 'SMP' | 'SMA' | null;
}

SoalAkademik.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    teks: { type: DataTypes.TEXT, allowNull: false },
    mata_pelajaran: { type: DataTypes.STRING(100), allowNull: false },
    gambar_url: { type: DataTypes.TEXT, allowNull: true },
    pilihan: { type: DataTypes.TEXT, allowNull: false },
    jawaban_benar: { type: DataTypes.TEXT, allowNull: false },
    urutan: { type: DataTypes.INTEGER, defaultValue: 0 },
    level: { type: DataTypes.ENUM('SD', 'SMP', 'SMA'), allowNull: true },
  },
  {
    sequelize,
    tableName: 'soal_akademik',
    modelName: 'SoalAkademik',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default SoalAkademik;
