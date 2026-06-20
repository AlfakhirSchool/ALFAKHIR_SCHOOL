import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listUsers, getUserDetail, createUser, resetPassword, toggleActive } from '../controllers/usersController';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const masterOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.school_level) {
    res.status(403).json({ success: false, message: 'Hanya Master Admin yang dapat mengelola akun' });
    return;
  }
  next();
};

router.use(authenticate, authorize('admin'), masterOnly);

router.get('/', listUsers);
router.get('/:id', getUserDetail);
router.post('/', createUser);
router.put('/:id/reset-password', resetPassword);
router.put('/:id/toggle-active', toggleActive);

export default router;
