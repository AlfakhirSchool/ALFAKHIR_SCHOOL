import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/catatanPewawancaraController';

const router = Router();

router.use(authenticate);

router.get('/kandidat/:kandidat_id', authorize('admin', 'guru'), ctrl.getByKandidat);
router.post('/kandidat/:kandidat_id', authorize('admin', 'guru'), ctrl.create);
router.put('/:id', authorize('admin', 'guru'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

export default router;
