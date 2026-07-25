import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/pendingChangeController';

const router = Router();

router.post('/request', authenticate, ctrl.requestChange);
router.get('/mine', authenticate, ctrl.myPending);
router.get('/', authenticate, authorize('admin'), ctrl.listPending);
router.put('/:id/review', authenticate, authorize('admin'), ctrl.reviewChange);

export default router;
