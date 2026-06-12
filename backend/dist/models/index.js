"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLog = exports.JurnalGuru = exports.Rapor = exports.PembayaranDetail = exports.Pembayaran = exports.Nilai = exports.QrCodeSession = exports.Absensi = exports.JadwalPelajaran = exports.OrangTua = exports.Guru = exports.Siswa = exports.MataPelajaran = exports.Kelas = exports.Sekolah = exports.User = void 0;
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
const ActivityLog_1 = __importDefault(require("./ActivityLog"));
exports.ActivityLog = ActivityLog_1.default;
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
// Activity Log
ActivityLog_1.default.belongsTo(User_1.default, { foreignKey: 'user_id', as: 'user' });
User_1.default.hasMany(ActivityLog_1.default, { foreignKey: 'user_id', as: 'activity_logs' });
