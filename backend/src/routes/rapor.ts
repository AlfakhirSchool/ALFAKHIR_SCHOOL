import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getRaporByKelas, generateRapor, getRaporSiswa } from '../controllers/raporController';

const router = Router();

router.use(authenticate);

router.get('/kelas/:kelas_id', authorize('admin', 'guru'), getRaporByKelas);
router.post('/generate', authorize('admin', 'guru'), generateRapor);
router.get('/siswa/:siswa_id', authorize('admin', 'guru', 'ortu', 'siswa'), getRaporSiswa);

export default router;
