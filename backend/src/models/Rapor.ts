import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface RaporAttributes {
  id: string;
  siswa_id: string;
  semester: number;
  tahun_ajaran: string;
  jumlah_hadir: number;
  jumlah_sakit: number;
  jumlah_izin: number;
  jumlah_alfa: number;
  nilai_rata_rata: number | null;
  ranking: number | null;
  pdf_file: string | null;
  generated_at: Date | null;
}

interface RaporCreationAttributes extends Optional<RaporAttributes, 'id' | 'nilai_rata_rata' | 'ranking' | 'pdf_file' | 'generated_at'> {}

class Rapor extends Model<RaporAttributes, RaporCreationAttributes> implements RaporAttributes {
  declare id: string;
  declare siswa_id: string;
  declare semester: number;
  declare tahun_ajaran: string;
  declare jumlah_hadir: number;
  declare jumlah_sakit: number;
  declare jumlah_izin: number;
  declare jumlah_alfa: number;
  declare nilai_rata_rata: number | null;
  declare ranking: number | null;
  declare pdf_file: string | null;
  declare generated_at: Date | null;
}

Rapor.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    siswa_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'siswa', key: 'id' } },
    semester: { type: DataTypes.INTEGER, allowNull: false },
    tahun_ajaran: { type: DataTypes.STRING(20), allowNull: false },
    jumlah_hadir: { type: DataTypes.INTEGER, defaultValue: 0 },
    jumlah_sakit: { type: DataTypes.INTEGER, defaultValue: 0 },
    jumlah_izin: { type: DataTypes.INTEGER, defaultValue: 0 },
    jumlah_alfa: { type: DataTypes.INTEGER, defaultValue: 0 },
    nilai_rata_rata: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    ranking: { type: DataTypes.INTEGER, allowNull: true },
    pdf_file: { type: DataTypes.STRING(500), allowNull: true },
    generated_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'rapor',
    timestamps: false,
    indexes: [{ unique: true, fields: ['siswa_id', 'semester', 'tahun_ajaran'] }],
  }
);

export default Rapor;
