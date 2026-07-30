import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as kandidatController from '../controllers/kandidatController';

const router = Router();

// Public routes
router.post('/daftar-publik', kandidatController.daftarPublik);
router.get('/publik/cari', kandidatController.cariPublik);
router.get('/publik/:id', kandidatController.infoPublik);

// All routes below require auth
router.use(authenticate);

// Admin routes
router.get('/', authorize('admin'), kandidatController.getAll);
router.post('/', authorize('admin'), kandidatController.create);
router.get('/monitor-pewawancara', authorize('admin'), kandidatController.monitorPewawancara);
router.get('/export', authorize('admin'), kandidatController.exportExcel);
router.get('/:id', authorize('admin'), kandidatController.getOne);
router.put('/:id', authorize('admin'), kandidatController.update);
router.delete('/:id', authorize('admin'), kandidatController.remove);
router.post('/:id/daftarkan', authorize('admin'), kandidatController.daftarkan);
router.post('/:id/generate-ai', authorize('admin'), kandidatController.generateRingkasanAI);
router.get('/:id/qrcode', authorize('admin'), kandidatController.getQrCode);

export default router;
