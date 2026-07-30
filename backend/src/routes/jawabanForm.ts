import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/jawabanFormController';

const router = Router();

router.get('/kandidat/:kandidat_id', ctrl.getByKandidat);
router.post('/kandidat/:kandidat_id', ctrl.submit);

router.use(authenticate);
router.get('/activity-feed', authorize('admin'), ctrl.getActivityFeed);

export default router;
