import { Router } from 'express';
import * as nilaiController from '../controllers/nilaiController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('guru', 'admin'), nilaiController.create);
router.get('/laporan', authorize('admin', 'guru'), nilaiController.getLaporan);
router.get('/:siswa_id', authorize('admin', 'guru', 'siswa', 'ortu'), nilaiController.getSiswa);
router.put('/:id', authorize('guru', 'admin'), nilaiController.update);
router.delete('/:id', authorize('admin'), nilaiController.remove);

export default router;
