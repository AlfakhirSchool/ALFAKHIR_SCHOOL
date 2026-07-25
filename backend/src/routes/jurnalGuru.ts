import { Router } from 'express';
import * as jurnalController from '../controllers/jurnalGuruController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('guru', 'admin'), jurnalController.create);
router.get('/', authorize('admin', 'guru'), jurnalController.getAll);
router.get('/laporan/kelas/:id', authorize('admin', 'guru'), jurnalController.getLaporanKelas);
router.get('/:id', authorize('admin', 'guru', 'ortu'), jurnalController.getById);
router.put('/:id', authorize('guru', 'admin'), jurnalController.update);
router.delete('/:id', authorize('admin', 'guru'), jurnalController.remove);
router.post('/:id/submit', authorize('guru'), jurnalController.submit);
router.post('/:id/review', authorize('admin', 'guru'), jurnalController.review);
router.get('/:id/export/pdf', authorize('admin', 'guru'), jurnalController.exportPdf);

export default router;
