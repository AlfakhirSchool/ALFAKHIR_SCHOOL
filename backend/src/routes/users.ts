import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listUsers, getUserDetail, createUser, resetPassword, toggleActive } from '../controllers/usersController';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/', listUsers);
router.get('/:id', getUserDetail);
router.post('/', createUser);
router.put('/:id/reset-password', resetPassword);
router.put('/:id/toggle-active', toggleActive);

export default router;
