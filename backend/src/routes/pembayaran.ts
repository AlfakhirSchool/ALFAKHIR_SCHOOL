import { Router } from 'express';
import * as pembayaranController from '../controllers/pembayaranController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Webhook: validasi token dari BCA/Mandiri via header X-Callback-Token
function webhookAuth(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const token = req.headers['x-callback-token'];
  const expected = process.env.WEBHOOK_CALLBACK_TOKEN;
  if (!expected || typeof token !== 'string') {
    res.status(401).json({ status: 'unauthorized' });
    return;
  }
  const crypto = require('crypto');
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ status: 'unauthorized' });
    return;
  }
  next();
}
router.post('/webhook/bca', webhookAuth, pembayaranController.webhookBca);
router.post('/webhook/mandiri', webhookAuth, pembayaranController.webhookMandiri);

router.use(authenticate);

router.get('/', authorize('admin', 'keuangan', 'ortu', 'siswa'), pembayaranController.getAll);
router.post('/', authorize('admin', 'keuangan'), pembayaranController.create);
router.get('/laporan', authorize('admin', 'keuangan'), pembayaranController.getLaporan);
router.put('/:id', authorize('admin'), pembayaranController.update);
router.delete('/:id', authorize('admin'), pembayaranController.remove);
router.post('/:id/bayar', authorize('admin', 'keuangan'), pembayaranController.bayar);

export default router;
