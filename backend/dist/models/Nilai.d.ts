import { Model, Optional } from 'sequelize';
interface NilaiAttributes {
    id: string;
    siswa_id: string;
    mata_pelajaran_id: string;
    guru_id: string;
    semester: number;
    tahun_ajaran: string;
    kuis: number | null;
    tugas: number | null;
    uts: number | null;
    uas: number | null;
    nilai_akhir: number | null;
    grade: string | null;
    predikat: string | null;
    catatan: string | null;
    input_date: Date | null;
    update_date: Date | null;
}
interface NilaiCreationAttributes extends Optional<NilaiAttributes, 'id' | 'kuis' | 'tugas' | 'uts' | 'uas' | 'nilai_akhir' | 'grade' | 'predikat' | 'catatan' | 'input_date' | 'update_date'> {
}
export declare function hitungNilaiAkhir(kuis: number, tugas: number, uts: number, uas: number): number;
export declare function hitungGrade(nilai: number): {
    grade: string;
    predikat: string;
};
declare class Nilai extends Model<NilaiAttributes, NilaiCreationAttributes> implements NilaiAttributes {
    id: string;
    siswa_id: string;
    mata_pelajaran_id: string;
    guru_id: string;
    semester: number;
    tahun_ajaran: string;
    kuis: number | null;
    tugas: number | null;
    uts: number | null;
    uas: number | null;
    nilai_akhir: number | null;
    grade: string | null;
    predikat: string | null;
    catatan: string | null;
    input_date: Date | null;
    update_date: Date | null;
}
export default Nilai;
