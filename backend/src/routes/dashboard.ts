import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/admin', authorize('admin'), dashboardController.adminDashboard);
router.get('/guru', authorize('guru', 'admin'), dashboardController.guruDashboard);
router.get('/parent', authorize('ortu'), dashboardController.parentDashboard);
router.get('/student', authorize('siswa'), dashboardController.studentDashboard);

export default router;
