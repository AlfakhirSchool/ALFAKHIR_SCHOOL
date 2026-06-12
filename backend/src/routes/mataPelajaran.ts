import { Router, Response } from 'express';
import { MataPelajaran } from '../models';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const list = await MataPelajaran.findAll({ order: [['nama', 'ASC']] });
  res.json({ success: true, data: list });
});

router.post('/', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const mapel = await MataPelajaran.create(req.body);
  res.status(201).json({ success: true, data: mapel });
});

router.put('/:id', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const mapel = await MataPelajaran.findByPk(req.params.id as string);
  if (!mapel) throw createError('Mata pelajaran tidak ditemukan', 404);
  await mapel.update(req.body);
  res.json({ success: true, data: mapel });
});

router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const mapel = await MataPelajaran.findByPk(req.params.id as string);
  if (!mapel) throw createError('Mata pelajaran tidak ditemukan', 404);
  await mapel.destroy();
  res.json({ success: true, message: 'Mata pelajaran berhasil dihapus' });
});

export default router;
