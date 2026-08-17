"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransaksiKeuangan = exports.Materi = exports.PengumpulanTugas = exports.Tugas = exports.CatatanSiswaGuru = exports.PertanyaanForm = exports.JawabanForm = exports.RingkasanAI = exports.JawabanAkademik = exports.HasilTesAkademik = exports.SoalAkademik = exports.CatatanPewawancara = exports.Kandidat = exports.Feedback = exports.PendingChange = exports.ActivityLog = exports.JurnalSiswa = exports.JurnalGuru = exports.Rapor = exports.PembayaranDetail = exports.Pembayaran = exports.Nilai = exports.QrCodeSession = exports.Absensi = exports.JadwalPelajaran = exports.OrangTua = exports.Guru = exports.Siswa = exports.MataPelajaran = exports.Kelas = exports.Sekolah = exports.User = void 0;
const User_1 = __importDefault(require("./User"));
exports.User = User_1.default;
const Sekolah_1 = __importDefault(require("./Sekolah"));
exports.Sekolah = Sekolah_1.default;
const Kelas_1 = __importDefault(require("./Kelas"));
exports.Kelas = Kelas_1.default;
const MataPelajaran_1 = __importDefault(require("./MataPelajaran"));
exports.MataPelajaran = MataPelajaran_1.default;
const Siswa_1 = __importDefault(require("./Siswa"));
exports.Siswa = Siswa_1.default;
const Guru_1 = __importDefault(require("./Guru"));
exports.Guru = Guru_1.default;
const OrangTua_1 = __importDefault(require("./OrangTua"));
exports.OrangTua = OrangTua_1.default;
const JadwalPelajaran_1 = __importDefault(require("./JadwalPelajaran"));
exports.JadwalPelajaran = JadwalPelajaran_1.default;
const Absensi_1 = __importDefault(require("./Absensi"));
exports.Absensi = Absensi_1.default;
const QrCodeSession_1 = __importDefault(require("./QrCodeSession"));
exports.QrCodeSession = QrCodeSession_1.default;
const Nilai_1 = __importDefault(require("./Nilai"));
exports.Nilai = Nilai_1.default;
const Pembayaran_1 = __importDefault(require("./Pembayaran"));
exports.Pembayaran = Pembayaran_1.default;
const PembayaranDetail_1 = __importDefault(require("./PembayaranDetail"));
exports.PembayaranDetail = PembayaranDetail_1.default;
const Rapor_1 = __importDefault(require("./Rapor"));
exports.Rapor = Rapor_1.default;
const JurnalGuru_1 = __importDefault(require("./JurnalGuru"));
exports.JurnalGuru = JurnalGuru_1.default;
const JurnalSiswa_1 = __importDefault(require("./JurnalSiswa"));
exports.JurnalSiswa = JurnalSiswa_1.default;
const ActivityLog_1 = __importDefault(require("./ActivityLog"));
exports.ActivityLog = ActivityLog_1.default;
const PendingChange_1 = __importDefault(require("./PendingChange"));
exports.PendingChange = PendingChange_1.default;
const Feedback_1 = require("./Feedback");
Object.defineProperty(exports, "Feedback", { enumerable: true, get: function () { return Feedback_1.Feedback; } });
const Kandidat_1 = __importDefault(require("./Kandidat"));
exports.Kandidat = Kandidat_1.default;
const CatatanPewawancara_1 = __importDefault(require("./CatatanPewawancara"));
exports.CatatanPewawancara = CatatanPewawancara_1.default;
const SoalAkademik_1 = __importDefault(require("./SoalAkademik"));
exports.SoalAkademik = SoalAkademik_1.default;
const HasilTesAkademik_1 = __importDefault(require("./HasilTesAkademik"));
exports.HasilTesAkademik = HasilTesAkademik_1.default;
const JawabanAkademik_1 = __importDefault(require("./JawabanAkademik"));
exports.JawabanAkademik = JawabanAkademik_1.default;
const RingkasanAI_1 = __importDefault(require("./RingkasanAI"));
exports.RingkasanAI = RingkasanAI_1.default;
const JawabanForm_1 = __importDefault(require("./JawabanForm"));
exports.JawabanForm = JawabanForm_1.default;
const PertanyaanForm_1 = __importDefault(require("./PertanyaanForm"));
exports.PertanyaanForm = PertanyaanForm_1.default;
const CatatanSiswaGuru_1 = __importDefault(require("./CatatanSiswaGuru"));
exports.CatatanSiswaGuru = CatatanSiswaGuru_1.default;
const Tugas_1 = __importDefault(require("./Tugas"));
exports.Tugas = Tugas_1.default;
const PengumpulanTugas_1 = __importDefault(require("./PengumpulanTugas"));
exports.PengumpulanTugas = PengumpulanTugas_1.default;
const TransaksiKeuangan_1 = __importDefault(require("./TransaksiKeuangan"));
exports.TransaksiKeuangan = TransaksiKeuangan_1.default;
const Materi_1 = __importDefault(require("./Materi"));
exports.Materi = Materi_1.default;
// User <-> Guru / Siswa / OrangTua
User_1.default.hasOne(Guru_1.default, { foreignKey: 'user_id', as: 'guru_detail' });
Guru_1.default.belongsTo(User_1.default, { foreignKey: 'user_id', as: 'user' });
User_1.default.hasOne(Siswa_1.default, { foreignKey: 'user_id', as: 'siswa_detail' });
Siswa_1.default.belongsTo(User_1.default, { foreignKey: 'user_id', as: 'user' });
User_1.default.hasMany(OrangTua_1.default, { foreignKey: 'user_id', as: 'ortu_detail' });
OrangTua_1.default.belongsTo(User_1.default, { foreignKey: 'user_id', as: 'user' });
// Sekolah <-> Kelas
Sekolah_1.default.hasMany(Kelas_1.default, { foreignKey: 'sekolah_id', as: 'kelas_list' });
Kelas_1.default.belongsTo(Sekolah_1.default, { foreignKey: 'sekolah_id', as: 'sekolah' });
// Guru <-> Kelas (wali kelas)
Guru_1.default.hasMany(Kelas_1.default, { foreignKey: 'wali_kelas_id', as: 'wali_kelas_di' });
Kelas_1.default.belongsTo(Guru_1.default, { foreignKey: 'wali_kelas_id', as: 'wali_kelas' });
// Kelas <-> Siswa
Kelas_1.default.hasMany(Siswa_1.default, { foreignKey: 'kelas_id', as: 'siswa_list' });
Siswa_1.default.belongsTo(Kelas_1.default, { foreignKey: 'kelas_id', as: 'kelas' });
// Siswa <-> OrangTua
Siswa_1.default.hasMany(OrangTua_1.default, { foreignKey: 'siswa_id', as: 'orang_tua_list' });
OrangTua_1.default.belongsTo(Siswa_1.default, { foreignKey: 'siswa_id', as: 'siswa' });
// Jadwal
Kelas_1.default.hasMany(JadwalPelajaran_1.default, { foreignKey: 'kelas_id', as: 'jadwal_list' });
JadwalPelajaran_1.default.belongsTo(Kelas_1.default, { foreignKey: 'kelas_id', as: 'kelas' });
Guru_1.default.hasMany(JadwalPelajaran_1.default, { foreignKey: 'guru_id', as: 'jadwal_mengajar' });
JadwalPelajaran_1.default.belongsTo(Guru_1.default, { foreignKey: 'guru_id', as: 'guru' });
MataPelajaran_1.default.hasMany(JadwalPelajaran_1.default, { foreignKey: 'mata_pelajaran_id', as: 'jadwal_mapel' });
JadwalPelajaran_1.default.belongsTo(MataPelajaran_1.default, { foreignKey: 'mata_pelajaran_id', as: 'mata_pelajaran' });
// Absensi
Siswa_1.default.hasMany(Absensi_1.default, { foreignKey: 'siswa_id', as: 'absensi_list' });
Absensi_1.default.belongsTo(Siswa_1.default, { foreignKey: 'siswa_id', as: 'siswa' });
JadwalPelajaran_1.default.hasMany(Absensi_1.default, { foreignKey: 'jadwal_pelajaran_id', as: 'absensi_list' });
Absensi_1.default.belongsTo(JadwalPelajaran_1.default, { foreignKey: 'jadwal_pelajaran_id', as: 'jadwal' });
// QR Session
JadwalPelajaran_1.default.hasMany(QrCodeSession_1.default, { foreignKey: 'jadwal_pelajaran_id', as: 'qr_sessions' });
QrCodeSession_1.default.belongsTo(JadwalPelajaran_1.default, { foreignKey: 'jadwal_pelajaran_id', as: 'jadwal' });
// Nilai
Siswa_1.default.hasMany(Nilai_1.default, { foreignKey: 'siswa_id', as: 'nilai_list' });
Nilai_1.default.belongsTo(Siswa_1.default, { foreignKey: 'siswa_id', as: 'siswa' });
MataPelajaran_1.default.hasMany(Nilai_1.default, { foreignKey: 'mata_pelajaran_id', as: 'nilai_list' });
Nilai_1.default.belongsTo(MataPelajaran_1.default, { foreignKey: 'mata_pelajaran_id', as: 'mata_pelajaran' });
Guru_1.default.hasMany(Nilai_1.default, { foreignKey: 'guru_id', as: 'nilai_input' });
Nilai_1.default.belongsTo(Guru_1.default, { foreignKey: 'guru_id', as: 'guru' });
// Pembayaran
Siswa_1.default.hasMany(Pembayaran_1.default, { foreignKey: 'siswa_id', as: 'pembayaran_list' });
Pembayaran_1.default.belongsTo(Siswa_1.default, { foreignKey: 'siswa_id', as: 'siswa' });
Pembayaran_1.default.hasMany(PembayaranDetail_1.default, { foreignKey: 'pembayaran_id', as: 'detail_list' });
PembayaranDetail_1.default.belongsTo(Pembayaran_1.default, { foreignKey: 'pembayaran_id', as: 'pembayaran' });
// Rapor
Siswa_1.default.hasMany(Rapor_1.default, { foreignKey: 'siswa_id', as: 'rapor_list' });
Rapor_1.default.belongsTo(Siswa_1.default, { foreignKey: 'siswa_id', as: 'siswa' });
// Jurnal Guru
Guru_1.default.hasMany(JurnalGuru_1.default, { foreignKey: 'guru_id', as: 'jurnal_list' });
JurnalGuru_1.default.belongsTo(Guru_1.default, { foreignKey: 'guru_id', as: 'guru' });
Kelas_1.default.hasMany(JurnalGuru_1.default, { foreignKey: 'kelas_id', as: 'jurnal_list' });
JurnalGuru_1.default.belongsTo(Kelas_1.default, { foreignKey: 'kelas_id', as: 'kelas' });
MataPelajaran_1.default.hasMany(JurnalGuru_1.default, { foreignKey: 'mata_pelajaran_id', as: 'jurnal_list' });
JurnalGuru_1.default.belongsTo(MataPelajaran_1.default, { foreignKey: 'mata_pelajaran_id', as: 'mata_pelajaran' });
JurnalGuru_1.default.hasMany(JurnalSiswa_1.default, { foreignKey: 'jurnal_id', as: 'detail_siswa' });
JurnalSiswa_1.default.belongsTo(JurnalGuru_1.default, { foreignKey: 'jurnal_id', as: 'jurnal' });
Siswa_1.default.hasMany(JurnalSiswa_1.default, { foreignKey: 'siswa_id', as: 'jurnal_detail' });
JurnalSiswa_1.default.belongsTo(Siswa_1.default, { foreignKey: 'siswa_id', as: 'siswa' });
// Activity Log
ActivityLog_1.default.belongsTo(User_1.default, { foreignKey: 'user_id', as: 'user' });
User_1.default.hasMany(ActivityLog_1.default, { foreignKey: 'user_id', as: 'activity_logs' });
// Pending Changes
PendingChange_1.default.belongsTo(User_1.default, { foreignKey: 'user_id', as: 'requester' });
User_1.default.hasMany(PendingChange_1.default, { foreignKey: 'user_id', as: 'pending_changes' });
// Feedback
Feedback_1.Feedback.belongsTo(User_1.default, { foreignKey: 'user_id', as: 'pengirim' });
User_1.default.hasMany(Feedback_1.Feedback, { foreignKey: 'user_id', as: 'feedback_list' });
// Kandidat (sistem penerimaan siswa baru)
Guru_1.default.hasMany(Kandidat_1.default, { foreignKey: 'pewawancara_id', as: 'kandidat_list' });
Kandidat_1.default.belongsTo(Guru_1.default, { foreignKey: 'pewawancara_id', as: 'pewawancara' });
// Kandidat sub-data
Kandidat_1.default.hasMany(CatatanPewawancara_1.default, { foreignKey: 'kandidat_id', as: 'catatan_list' });
CatatanPewawancara_1.default.belongsTo(Kandidat_1.default, { foreignKey: 'kandidat_id', as: 'kandidat' });
Kandidat_1.default.hasOne(HasilTesAkademik_1.default, { foreignKey: 'kandidat_id', as: 'hasil_tes' });
HasilTesAkademik_1.default.belongsTo(Kandidat_1.default, { foreignKey: 'kandidat_id', as: 'kandidat' });
Kandidat_1.default.hasMany(JawabanAkademik_1.default, { foreignKey: 'kandidat_id', as: 'jawaban_list' });
JawabanAkademik_1.default.belongsTo(Kandidat_1.default, { foreignKey: 'kandidat_id', as: 'kandidat' });
SoalAkademik_1.default.hasMany(JawabanAkademik_1.default, { foreignKey: 'soal_id', as: 'jawaban_list' });
JawabanAkademik_1.default.belongsTo(SoalAkademik_1.default, { foreignKey: 'soal_id', as: 'soal' });
Kandidat_1.default.hasOne(RingkasanAI_1.default, { foreignKey: 'kandidat_id', as: 'ringkasan_ai' });
RingkasanAI_1.default.belongsTo(Kandidat_1.default, { foreignKey: 'kandidat_id', as: 'kandidat' });
Kandidat_1.default.hasMany(JawabanForm_1.default, { foreignKey: 'kandidat_id', as: 'jawaban_form_list' });
JawabanForm_1.default.belongsTo(Kandidat_1.default, { foreignKey: 'kandidat_id', as: 'kandidat' });
Siswa_1.default.hasMany(CatatanSiswaGuru_1.default, { foreignKey: 'siswa_id', as: 'catatan_guru_list' });
CatatanSiswaGuru_1.default.belongsTo(Siswa_1.default, { foreignKey: 'siswa_id', as: 'siswa' });
Guru_1.default.hasMany(CatatanSiswaGuru_1.default, { foreignKey: 'guru_id', as: 'catatan_siswa_list' });
CatatanSiswaGuru_1.default.belongsTo(Guru_1.default, { foreignKey: 'guru_id', as: 'guru' });
// Tugas & Pengumpulan
Guru_1.default.hasMany(Tugas_1.default, { foreignKey: 'guru_id', as: 'tugas_list' });
Tugas_1.default.belongsTo(Guru_1.default, { foreignKey: 'guru_id', as: 'guru' });
Kelas_1.default.hasMany(Tugas_1.default, { foreignKey: 'kelas_id', as: 'tugas_kelas' });
Tugas_1.default.belongsTo(Kelas_1.default, { foreignKey: 'kelas_id', as: 'kelas' });
Tugas_1.default.hasMany(PengumpulanTugas_1.default, { foreignKey: 'tugas_id', as: 'pengumpulan_list' });
PengumpulanTugas_1.default.belongsTo(Tugas_1.default, { foreignKey: 'tugas_id', as: 'tugas' });
Siswa_1.default.hasMany(PengumpulanTugas_1.default, { foreignKey: 'siswa_id', as: 'pengumpulan_tugas' });
PengumpulanTugas_1.default.belongsTo(Siswa_1.default, { foreignKey: 'siswa_id', as: 'siswa' });
// Materi associations
Guru_1.default.hasMany(Materi_1.default, { foreignKey: 'guru_id', as: 'materi_list' });
Materi_1.default.belongsTo(Guru_1.default, { foreignKey: 'guru_id', as: 'guru' });
Kelas_1.default.hasMany(Materi_1.default, { foreignKey: 'kelas_id', as: 'materi_kelas' });
Materi_1.default.belongsTo(Kelas_1.default, { foreignKey: 'kelas_id', as: 'kelas' });
MataPelajaran_1.default.hasMany(Materi_1.default, { foreignKey: 'mata_pelajaran_id', as: 'materi_list' });
Materi_1.default.belongsTo(MataPelajaran_1.default, { foreignKey: 'mata_pelajaran_id', as: 'mata_pelajaran' });
