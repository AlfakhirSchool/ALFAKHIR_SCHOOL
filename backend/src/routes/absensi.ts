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
router.get('/laporan', authorize('admin', 'guru'), absensiController.getLaporan);
router.get('/:siswa_id/detail', authorize('admin', 'guru', 'siswa', 'ortu'), absensiController.getSiswaDetail);

export default router;
