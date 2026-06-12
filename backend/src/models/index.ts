import User from './User';
import Sekolah from './Sekolah';
import Kelas from './Kelas';
import MataPelajaran from './MataPelajaran';
import Siswa from './Siswa';
import Guru from './Guru';
import OrangTua from './OrangTua';
import JadwalPelajaran from './JadwalPelajaran';
import Absensi from './Absensi';
import QrCodeSession from './QrCodeSession';
import Nilai from './Nilai';
import Pembayaran from './Pembayaran';
import PembayaranDetail from './PembayaranDetail';
import Rapor from './Rapor';
import JurnalGuru from './JurnalGuru';
import ActivityLog from './ActivityLog';

// User <-> Guru / Siswa / OrangTua
User.hasOne(Guru, { foreignKey: 'user_id', as: 'guru_detail' });
Guru.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasOne(Siswa, { foreignKey: 'user_id', as: 'siswa_detail' });
Siswa.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(OrangTua, { foreignKey: 'user_id', as: 'ortu_detail' });
OrangTua.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Sekolah <-> Kelas
Sekolah.hasMany(Kelas, { foreignKey: 'sekolah_id', as: 'kelas_list' });
Kelas.belongsTo(Sekolah, { foreignKey: 'sekolah_id', as: 'sekolah' });

// Guru <-> Kelas (wali kelas)
Guru.hasMany(Kelas, { foreignKey: 'wali_kelas_id', as: 'wali_kelas_di' });
Kelas.belongsTo(Guru, { foreignKey: 'wali_kelas_id', as: 'wali_kelas' });

// Kelas <-> Siswa
Kelas.hasMany(Siswa, { foreignKey: 'kelas_id', as: 'siswa_list' });
Siswa.belongsTo(Kelas, { foreignKey: 'kelas_id', as: 'kelas' });

// Siswa <-> OrangTua
Siswa.hasMany(OrangTua, { foreignKey: 'siswa_id', as: 'orang_tua_list' });
OrangTua.belongsTo(Siswa, { foreignKey: 'siswa_id', as: 'siswa' });

// Jadwal
Kelas.hasMany(JadwalPelajaran, { foreignKey: 'kelas_id', as: 'jadwal_list' });
JadwalPelajaran.belongsTo(Kelas, { foreignKey: 'kelas_id', as: 'kelas' });

Guru.hasMany(JadwalPelajaran, { foreignKey: 'guru_id', as: 'jadwal_mengajar' });
JadwalPelajaran.belongsTo(Guru, { foreignKey: 'guru_id', as: 'guru' });

MataPelajaran.hasMany(JadwalPelajaran, { foreignKey: 'mata_pelajaran_id', as: 'jadwal_mapel' });
JadwalPelajaran.belongsTo(MataPelajaran, { foreignKey: 'mata_pelajaran_id', as: 'mata_pelajaran' });

// Absensi
Siswa.hasMany(Absensi, { foreignKey: 'siswa_id', as: 'absensi_list' });
Absensi.belongsTo(Siswa, { foreignKey: 'siswa_id', as: 'siswa' });

JadwalPelajaran.hasMany(Absensi, { foreignKey: 'jadwal_pelajaran_id', as: 'absensi_list' });
Absensi.belongsTo(JadwalPelajaran, { foreignKey: 'jadwal_pelajaran_id', as: 'jadwal' });

// QR Session
JadwalPelajaran.hasMany(QrCodeSession, { foreignKey: 'jadwal_pelajaran_id', as: 'qr_sessions' });
QrCodeSession.belongsTo(JadwalPelajaran, { foreignKey: 'jadwal_pelajaran_id', as: 'jadwal' });

// Nilai
Siswa.hasMany(Nilai, { foreignKey: 'siswa_id', as: 'nilai_list' });
Nilai.belongsTo(Siswa, { foreignKey: 'siswa_id', as: 'siswa' });

MataPelajaran.hasMany(Nilai, { foreignKey: 'mata_pelajaran_id', as: 'nilai_list' });
Nilai.belongsTo(MataPelajaran, { foreignKey: 'mata_pelajaran_id', as: 'mata_pelajaran' });

Guru.hasMany(Nilai, { foreignKey: 'guru_id', as: 'nilai_input' });
Nilai.belongsTo(Guru, { foreignKey: 'guru_id', as: 'guru' });

// Pembayaran
Siswa.hasMany(Pembayaran, { foreignKey: 'siswa_id', as: 'pembayaran_list' });
Pembayaran.belongsTo(Siswa, { foreignKey: 'siswa_id', as: 'siswa' });

Pembayaran.hasMany(PembayaranDetail, { foreignKey: 'pembayaran_id', as: 'detail_list' });
PembayaranDetail.belongsTo(Pembayaran, { foreignKey: 'pembayaran_id', as: 'pembayaran' });

// Rapor
Siswa.hasMany(Rapor, { foreignKey: 'siswa_id', as: 'rapor_list' });
Rapor.belongsTo(Siswa, { foreignKey: 'siswa_id', as: 'siswa' });

// Jurnal Guru
Guru.hasMany(JurnalGuru, { foreignKey: 'guru_id', as: 'jurnal_list' });
JurnalGuru.belongsTo(Guru, { foreignKey: 'guru_id', as: 'guru' });

Kelas.hasMany(JurnalGuru, { foreignKey: 'kelas_id', as: 'jurnal_list' });
JurnalGuru.belongsTo(Kelas, { foreignKey: 'kelas_id', as: 'kelas' });

MataPelajaran.hasMany(JurnalGuru, { foreignKey: 'mata_pelajaran_id', as: 'jurnal_list' });
JurnalGuru.belongsTo(MataPelajaran, { foreignKey: 'mata_pelajaran_id', as: 'mata_pelajaran' });

export {
  User, Sekolah, Kelas, MataPelajaran,
  Siswa, Guru, OrangTua,
  JadwalPelajaran, Absensi, QrCodeSession,
  Nilai, Pembayaran, PembayaranDetail,
  Rapor, JurnalGuru, ActivityLog,
};
