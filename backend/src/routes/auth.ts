import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh', authController.refreshToken);
router.get('/profile', authenticate, authController.getProfile);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/upload-photo', authenticate, authController.upload.single('photo'), authController.uploadProfilePhoto);
router.post('/reset-device/:userId', authenticate, authorize('admin'), authController.resetDevice);

export default router;
