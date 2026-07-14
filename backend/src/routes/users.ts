import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { listUsers, getUserDetail, createUser, resetPassword, toggleActive, setGuruJenjang, deleteUser } from '../controllers/usersController';

const router = Router();

// Semua admin (master + jenjang) bisa akses; scope filtering dilakukan di controller
router.use(authenticate, authorize('admin'));

router.get('/', listUsers);
router.get('/:id', getUserDetail);
router.post('/', createUser);
router.put('/:id/reset-password', resetPassword);
router.put('/:id/toggle-active', toggleActive);
router.put('/:id/set-jenjang', setGuruJenjang);
router.delete('/:id', deleteUser);

export default router;
