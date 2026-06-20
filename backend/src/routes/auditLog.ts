import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getAuditLogs, getAuditLogStats, getLiveFeed } from '../controllers/auditLogController';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/', getAuditLogs);
router.get('/stats', getAuditLogStats);
router.get('/live', getLiveFeed);

export default router;
