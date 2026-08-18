import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import * as ctrl from '../controllers/soalAkademikController';

const router = Router();

// Public routes (no auth)
router.post('/kandidat/:kandidat_id/submit', rateLimiter(5, 10 * 60 * 1000), ctrl.submitTes);
router.get('/publik', rateLimiter(30, 60 * 1000), ctrl.getAllPublik);

router.use(authenticate);

// Soal management (admin only)
router.get('/', authorize('admin'), ctrl.getAll);
router.post('/', authorize('admin'), ctrl.create);
router.put('/:id', authorize('admin'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

router.get('/kandidat/:kandidat_id/hasil', authorize('admin', 'guru', 'pewawancara'), ctrl.getHasil);

export default router;
