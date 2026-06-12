import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getAuditLogs, getAuditLogStats } from '../controllers/auditLogController';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/', getAuditLogs);
router.get('/stats', getAuditLogStats);

export default router;
