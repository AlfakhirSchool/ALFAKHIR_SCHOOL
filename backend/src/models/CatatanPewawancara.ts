import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface CatatanPewawancaraAttributes {
  id: string;
  kandidat_id: string;
  pewawancara_email: string | null;
  pewawancara_nama: string | null;
  observasi: string | null;
  penilaian_akademik: string | null;
  dukungan_keluarga: string | null;
  catatan_karakter: string | null;
  catatan_lain: string | null;
  rekomendasi: string | null;
  is_locked: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface CatatanPewawancaraCreationAttributes extends Optional<CatatanPewawancaraAttributes,
  'id' | 'pewawancara_email' | 'pewawancara_nama' | 'observasi' | 'penilaian_akademik' |
  'dukungan_keluarga' | 'catatan_karakter' | 'catatan_lain' | 'rekomendasi' | 'is_locked'
> {}

class CatatanPewawancara extends Model<CatatanPewawancaraAttributes, CatatanPewawancaraCreationAttributes>
  implements CatatanPewawancaraAttributes {
  declare id: string;
  declare kandidat_id: string;
  declare pewawancara_email: string | null;
  declare pewawancara_nama: string | null;
  declare observasi: string | null;
  declare penilaian_akademik: string | null;
  declare dukungan_keluarga: string | null;
  declare catatan_karakter: string | null;
  declare catatan_lain: string | null;
  declare rekomendasi: string | null;
  declare is_locked: boolean;
}

CatatanPewawancara.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    kandidat_id: { type: DataTypes.UUID, allowNull: false },
    pewawancara_email: { type: DataTypes.STRING(150), allowNull: true },
    pewawancara_nama: { type: DataTypes.STRING(150), allowNull: true },
    observasi: { type: DataTypes.TEXT, allowNull: true },
    penilaian_akademik: { type: DataTypes.TEXT, allowNull: true },
    dukungan_keluarga: { type: DataTypes.TEXT, allowNull: true },
    catatan_karakter: { type: DataTypes.TEXT, allowNull: true },
    catatan_lain: { type: DataTypes.TEXT, allowNull: true },
    rekomendasi: { type: DataTypes.STRING(50), allowNull: true },
    is_locked: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    sequelize,
    tableName: 'catatan_pewawancara',
    modelName: 'CatatanPewawancara',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default CatatanPewawancara;
