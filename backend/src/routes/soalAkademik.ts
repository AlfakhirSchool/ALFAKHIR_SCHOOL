import { Router } from 'express';
import { authorize } from '../middleware/auth';
import * as ctrl from '../controllers/soalAkademikController';

const router = Router();

// Soal management (admin only)
router.get('/', authorize('admin'), ctrl.getAll);
router.post('/', authorize('admin'), ctrl.create);
router.put('/:id', authorize('admin'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

// Tes per kandidat
router.post('/kandidat/:kandidat_id/submit', ctrl.submitTes); // public (token dari link)
router.get('/kandidat/:kandidat_id/hasil', authorize('admin', 'guru'), ctrl.getHasil);

export default router;
