import { Router } from 'express';
import * as guruController from '../controllers/guruController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin'), guruController.getAll);
router.post('/', authorize('admin'), guruController.create);
router.get('/:id', authorize('admin', 'guru'), guruController.getById);
router.put('/:id', authorize('admin'), guruController.update);
router.delete('/:id', authorize('admin'), guruController.remove);

export default router;
