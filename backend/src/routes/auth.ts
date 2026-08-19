import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Max 10 percobaan per username per 15 menit (bukan per IP — sekolah pakai WiFi shared/NAT)
router.post('/login', rateLimiter(10, 15 * 60 * 1000, (req) => {
  const id = req.body?.username || req.body?.nis || req.body?.email || req.ip || 'unknown';
  return `login:${id}`;
}), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', rateLimiter(30, 15 * 60 * 1000), authController.refreshToken);
router.get('/profile', authenticate, authController.getProfile);
router.get('/me', authenticate, authController.getProfile);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/upload-photo', authenticate, authController.upload.single('photo'), authController.uploadProfilePhoto);
router.post('/reset-device/:userId', authenticate, authorize('admin'), authController.resetDevice);
router.post('/switch-account/:userId', authenticate, authorize('admin'), authController.switchAccount);

export default router;
