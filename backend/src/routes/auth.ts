import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Max 20 percobaan login per 15 menit per IP
router.post('/login', rateLimiter(20, 15 * 60 * 1000), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', rateLimiter(30, 15 * 60 * 1000), authController.refreshToken);
router.get('/profile', authenticate, authController.getProfile);
router.get('/me', authenticate, authController.getProfile);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/upload-photo', authenticate, authController.upload.single('photo'), authController.uploadProfilePhoto);
router.post('/reset-device/:userId', authenticate, authorize('admin'), authController.resetDevice);
router.post('/switch-account/:userId', authenticate, authorize('admin'), authController.switchAccount);

export default router;
