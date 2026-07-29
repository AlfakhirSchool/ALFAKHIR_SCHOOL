import { Router } from 'express';
import * as absensiController from '../controllers/absensiController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/qr-session/create', authorize('guru', 'admin'), absensiController.createQrSession);
router.post('/qr-session/:id/close', authorize('guru', 'admin'), absensiController.closeQrSession);
router.post('/scan-qr', authorize('siswa', 'guru', 'admin'), absensiController.scanQr);
router.post('/input-code', authorize('siswa', 'guru', 'admin'), absensiController.inputCode);
router.post('/manual', authorize('guru', 'admin'), absensiController.manualInput);
router.put('/:id', authorize('guru', 'admin'), absensiController.update);
router.delete('/:id', authorize('admin'), absensiController.remove);
router.get('/laporan', authorize('admin', 'guru'), absensiController.getLaporan);
// Guru: persiapan absensi per jadwal (auto-fill dari gate), bulk submit
router.get('/persiapan-guru', authorize('guru', 'admin'), absensiController.persiapanGuru);
router.post('/bulk-guru', authorize('guru', 'admin'), absensiController.bulkGuru);
router.post('/bulk-kelas', authorize('admin', 'guru'), absensiController.bulkKelas);
router.post('/izin-bulk', authorize('guru', 'admin'), absensiController.izinBulk);
// Wali kelas: rekap kelas yang diampu
router.get('/wali-kelas', authorize('guru', 'admin'), absensiController.rekapWaliKelas);
// Download rekap bulanan Excel
router.get('/rekap-download', authorize('guru', 'admin'), absensiController.downloadRekap);
// JSON data preview rekap per mata pelajaran
router.get('/rekap-data', authorize('guru', 'admin'), absensiController.rekapData);
router.get('/:siswa_id/detail', authorize('admin', 'guru', 'siswa', 'ortu'), absensiController.getSiswaDetail);

export default router;
