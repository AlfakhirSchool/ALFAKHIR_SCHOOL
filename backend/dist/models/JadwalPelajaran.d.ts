import { Model, Optional } from 'sequelize';
interface JadwalPelajaranAttributes {
    id: string;
    kelas_id: string;
    guru_id: string;
    mata_pelajaran_id: string;
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
    ruangan: string | null;
}
interface JadwalPelajaranCreationAttributes extends Optional<JadwalPelajaranAttributes, 'id' | 'ruangan'> {
}
declare class JadwalPelajaran extends Model<JadwalPelajaranAttributes, JadwalPelajaranCreationAttributes> implements JadwalPelajaranAttributes {
    id: string;
    kelas_id: string;
    guru_id: string;
    mata_pelajaran_id: string;
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
    ruangan: string | null;
}
export default JadwalPelajaran;
