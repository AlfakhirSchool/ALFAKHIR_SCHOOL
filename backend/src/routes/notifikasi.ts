import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { registerFcmToken, getNotifications, markRead } from '../controllers/notifikasiController';

const router = Router();

router.use(authenticate);

router.post('/fcm-token', registerFcmToken);
router.get('/', getNotifications);
router.put('/:id/read', markRead);

export default router;
