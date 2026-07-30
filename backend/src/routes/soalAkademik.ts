import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/soalAkademikController';

const router = Router();

// Public routes (no auth)
router.post('/kandidat/:kandidat_id/submit', ctrl.submitTes);
router.get('/publik', ctrl.getAllPublik);

router.use(authenticate);

// Soal management (admin only)
router.get('/', authorize('admin'), ctrl.getAll);
router.post('/', authorize('admin'), ctrl.create);
router.put('/:id', authorize('admin'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

router.get('/kandidat/:kandidat_id/hasil', authorize('admin', 'guru'), ctrl.getHasil);

export default router;
