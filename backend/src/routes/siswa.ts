import { Router } from 'express';
import * as siswaController from '../controllers/siswaController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/me', authorize('siswa'), siswaController.getMe);
router.get('/', authorize('admin', 'guru'), siswaController.getAll);
router.get('/sekolah-list', authorize('admin', 'guru'), siswaController.getSekolahList);
router.post('/', authorize('admin'), siswaController.create);
router.post('/import-csv', authorize('admin'), siswaController.importCsv);
router.post('/sync-sheets', authorize('admin'), siswaController.syncFromSheets);
router.get('/:id', authorize('admin', 'guru', 'siswa', 'ortu'), siswaController.getById);
router.put('/:id', authorize('admin'), siswaController.update);
router.delete('/:id', authorize('admin'), siswaController.remove);

export default router;
