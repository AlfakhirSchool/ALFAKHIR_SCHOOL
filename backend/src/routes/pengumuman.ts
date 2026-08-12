import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getPengumuman, getPengumumanById, createPengumuman, updatePengumuman, deletePengumuman } from '../controllers/pengumumanController';

const router = Router();

router.get('/', authenticate, getPengumuman);
router.get('/:id', authenticate, getPengumumanById);
router.post('/', authenticate, createPengumuman);
router.put('/:id', authenticate, updatePengumuman);
router.delete('/:id', authenticate, deletePengumuman);

export default router;
