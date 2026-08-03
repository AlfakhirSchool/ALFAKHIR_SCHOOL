import { Router } from 'express';
import * as jurnalController from '../controllers/jurnalGuruController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('guru', 'admin'), jurnalController.create);
router.get('/', authorize('admin', 'guru'), jurnalController.getAll);
router.get('/laporan/kelas/:id', authorize('admin', 'guru'), jurnalController.getLaporanKelas);
router.get('/siswa-riwayat/:siswa_id', authorize('guru', 'admin'), jurnalController.getRiwayatSiswa);
router.get('/download/excel', authorize('admin', 'guru'), jurnalController.downloadExcel);
router.get('/:id', authorize('admin', 'guru', 'ortu'), jurnalController.getById);
router.put('/:id', authorize('guru', 'admin'), jurnalController.update);
router.delete('/:id', authorize('admin', 'guru'), jurnalController.remove);
router.get('/:id/siswa', authorize('guru', 'admin'), jurnalController.getSiswaDetail);
router.put('/:id/siswa', authorize('guru', 'admin'), jurnalController.saveSiswaDetail);
router.post('/:id/submit', authorize('guru'), jurnalController.submit);
router.post('/:id/review', authorize('admin', 'guru'), jurnalController.review);
router.get('/:id/export/pdf', authorize('admin', 'guru'), jurnalController.exportPdf);

export default router;
