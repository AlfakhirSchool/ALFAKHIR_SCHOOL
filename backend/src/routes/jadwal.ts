import { Router, Response } from 'express';
import { JadwalPelajaran, Guru, Kelas, MataPelajaran, User } from '../models';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { kelasIdFilter } from '../utils/levelFilter';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { guru_id, kelas_id } = req.query;
  const levelWhere = await kelasIdFilter(req.user?.school_level);
  const where: Record<string, unknown> = { ...levelWhere };
  if (guru_id) where.guru_id = guru_id;
  if (kelas_id) where.kelas_id = kelas_id;

  const jadwalList = await JadwalPelajaran.findAll({
    where,
    include: [
      { model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
      { model: Kelas, as: 'kelas' },
      { model: MataPelajaran, as: 'mata_pelajaran' },
    ],
    order: [['hari', 'ASC'], ['jam_mulai', 'ASC']],
  });

  res.json({ success: true, data: jadwalList });
});

router.post('/', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const jadwal = await JadwalPelajaran.create(req.body);
  res.status(201).json({ success: true, data: jadwal });
});

router.put('/:id', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const jadwal = await JadwalPelajaran.findByPk(req.params.id as string);
  if (!jadwal) throw createError('Jadwal tidak ditemukan', 404);
  await jadwal.update(req.body);
  res.json({ success: true, data: jadwal });
});

router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const jadwal = await JadwalPelajaran.findByPk(req.params.id as string);
  if (!jadwal) throw createError('Jadwal tidak ditemukan', 404);
  await jadwal.destroy();
  res.json({ success: true, message: 'Jadwal berhasil dihapus' });
});

export default router;
