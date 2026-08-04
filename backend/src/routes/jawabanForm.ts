import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/jawabanFormController';

const router = Router();

// Endpoint publik PPDB — kandidat akses via UUID (token akses tersirat)
// UUID v4 sudah cukup sebagai token; validasi format untuk mencegah path traversal
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validateKandidatId = (req: any, res: any, next: any) => {
  if (!uuidRegex.test(req.params.kandidat_id)) {
    res.status(400).json({ success: false, message: 'ID tidak valid' }); return;
  }
  next();
};
router.get('/kandidat/:kandidat_id', validateKandidatId, ctrl.getByKandidat);
router.post('/kandidat/:kandidat_id', validateKandidatId, ctrl.submit);

router.use(authenticate);
router.get('/activity-feed', authorize('admin'), ctrl.getActivityFeed);

export default router;
