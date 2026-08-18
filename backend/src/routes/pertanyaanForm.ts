import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import * as ctrl from '../controllers/pertanyaanFormController';

const router = Router();

router.get('/', rateLimiter(60, 60 * 1000), ctrl.getAll);

router.use(authenticate);
router.post('/', authorize('admin'), ctrl.create);
router.put('/:id', authorize('admin'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

export default router;
