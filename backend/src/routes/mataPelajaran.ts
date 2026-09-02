import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { MataPelajaran } from '../models';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { cache } from '../middleware/cacheMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', cache(300), async (req: AuthRequest, res: Response): Promise<void> => {
  const { jenjang } = req.query;
  const where: any = {};
  if (jenjang && jenjang !== 'all') where[Op.or] = [{ jenjang: jenjang as string }, { jenjang: null }];
  const list = await MataPelajaran.findAll({ where, order: [['nama', 'ASC']] });
  res.json({ success: true, data: list });
});

router.post('/', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const mapel = await MataPelajaran.create(req.body);
    res.status(201).json({ success: true, data: mapel });
  } catch (e: any) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ success: false, message: `Kode "${req.body.kode}" sudah digunakan mata pelajaran lain` });
    } else {
      res.status(500).json({ success: false, message: e.message || 'Gagal menyimpan' });
    }
  }
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
