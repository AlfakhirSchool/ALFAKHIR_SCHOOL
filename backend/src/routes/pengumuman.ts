import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getPengumuman, getPengumumanById, createPengumuman, updatePengumuman, deletePengumuman } from '../controllers/pengumumanController';
import { cache } from '../middleware/cacheMiddleware';

const router = Router();

router.get('/', authenticate, cache(60), getPengumuman);
router.get('/:id', authenticate, getPengumumanById);
router.post('/', authenticate, authorize('admin'), createPengumuman);
router.put('/:id', authenticate, authorize('admin'), updatePengumuman);
router.delete('/:id', authenticate, authorize('admin'), deletePengumuman);

export default router;
