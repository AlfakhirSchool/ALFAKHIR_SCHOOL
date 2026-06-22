import { Router } from 'express';
import * as pembayaranController from '../controllers/pembayaranController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Webhook tidak perlu auth (dipanggil oleh BCA/Mandiri)
router.post('/webhook/bca', pembayaranController.webhookBca);
router.post('/webhook/mandiri', pembayaranController.webhookMandiri);

router.use(authenticate);

router.get('/', authorize('admin', 'ortu', 'siswa'), pembayaranController.getAll);
router.post('/', authorize('admin'), pembayaranController.create);
router.get('/laporan', authorize('admin'), pembayaranController.getLaporan);
router.put('/:id', authorize('admin'), pembayaranController.update);
router.delete('/:id', authorize('admin'), pembayaranController.remove);
router.post('/:id/bayar', authorize('admin'), pembayaranController.bayar);

export default router;
