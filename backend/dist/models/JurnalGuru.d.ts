import { Model, Optional } from 'sequelize';
export type StatusJurnal = 'draft' | 'submitted' | 'reviewed' | 'approved';
interface JurnalGuruAttributes {
    id: string;
    guru_id: string;
    wali_kelas_id: string | null;
    kelas_id: string;
    mata_pelajaran_id: string;
    tanggal: Date;
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
    topik_pelajaran: string;
    metode_pembelajaran: string | null;
    deskripsi_pembelajaran: string | null;
    hasil_pembelajaran: string | null;
    hambatan_pembelajaran: string | null;
    rencana_tindak_lanjut: string | null;
    media_pembelajaran: string | null;
    sumber_belajar: string | null;
    jumlah_siswa_hadir: number;
    jumlah_siswa_sakit: number;
    jumlah_siswa_izin: number;
    jumlah_siswa_alfa: number;
    ttd_guru: string | null;
    signed_at: Date | null;
    ttd_wali_kelas: string | null;
    wali_kelas_signed_at: Date | null;
    status: StatusJurnal;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date | null;
}
interface JurnalGuruCreationAttributes extends Optional<JurnalGuruAttributes, 'id' | 'wali_kelas_id' | 'metode_pembelajaran' | 'deskripsi_pembelajaran' | 'hasil_pembelajaran' | 'hambatan_pembelajaran' | 'rencana_tindak_lanjut' | 'media_pembelajaran' | 'sumber_belajar' | 'ttd_guru' | 'signed_at' | 'ttd_wali_kelas' | 'wali_kelas_signed_at' | 'status' | 'deleted_at'> {
}
declare class JurnalGuru extends Model<JurnalGuruAttributes, JurnalGuruCreationAttributes> implements JurnalGuruAttributes {
    id: string;
    guru_id: string;
    wali_kelas_id: string | null;
    kelas_id: string;
    mata_pelajaran_id: string;
    tanggal: Date;
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
    topik_pelajaran: string;
    metode_pembelajaran: string | null;
    deskripsi_pembelajaran: string | null;
    hasil_pembelajaran: string | null;
    hambatan_pembelajaran: string | null;
    rencana_tindak_lanjut: string | null;
    media_pembelajaran: string | null;
    sumber_belajar: string | null;
    jumlah_siswa_hadir: number;
    jumlah_siswa_sakit: number;
    jumlah_siswa_izin: number;
    jumlah_siswa_alfa: number;
    ttd_guru: string | null;
    signed_at: Date | null;
    ttd_wali_kelas: string | null;
    wali_kelas_signed_at: Date | null;
    status: StatusJurnal;
    readonly created_at: Date;
    readonly updated_at: Date;
    deleted_at: Date | null;
}
export default JurnalGuru;
