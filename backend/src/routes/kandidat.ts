import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as kandidatController from '../controllers/kandidatController';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes — rate limit 20 req/15mnt per IP
router.post('/daftar-publik', rateLimiter(20, 15 * 60 * 1000), kandidatController.daftarPublik);
router.get('/publik/cari', rateLimiter(60, 60 * 1000), kandidatController.cariPublik);
router.get('/publik/:id', rateLimiter(60, 60 * 1000), kandidatController.infoPublik);

// All routes below require auth
router.use(authenticate);

// Admin routes
router.get('/', authorize('admin', 'guru', 'pewawancara'), kandidatController.getAll);
router.post('/', authorize('admin'), kandidatController.create);
router.get('/monitor-pewawancara', authorize('admin'), kandidatController.monitorPewawancara);
router.get('/export', authorize('admin'), kandidatController.exportExcel);
router.get('/:id', authorize('admin', 'guru', 'pewawancara'), kandidatController.getOne);
router.put('/:id', authorize('admin'), kandidatController.update);
router.delete('/:id', authorize('admin'), kandidatController.remove);
router.post('/:id/daftarkan', authorize('admin'), kandidatController.daftarkan);
router.post('/:id/generate-ai', authorize('admin', 'guru', 'pewawancara'), kandidatController.generateRingkasanAI);
router.get('/:id/qrcode', authorize('admin'), kandidatController.getQrCode);
router.patch('/:id/status', authorize('admin', 'pewawancara'), kandidatController.updateStatus);

export default router;
