import { Router, Response } from 'express';
import { Kelas, Sekolah, Guru, Siswa, User, JadwalPelajaran, MataPelajaran } from '../models';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { sekolah_id, tahun_ajaran } = req.query;
  const where: Record<string, unknown> = {};
  if (sekolah_id) where.sekolah_id = sekolah_id;
  if (tahun_ajaran) where.tahun_ajaran = tahun_ajaran;

  const kelasList = await Kelas.findAll({
    where,
    include: [
      { model: Sekolah, as: 'sekolah' },
      { model: Guru, as: 'wali_kelas', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
    ],
    order: [['tingkat', 'ASC'], ['nama', 'ASC']],
  });

  res.json({ success: true, data: kelasList });
});

router.post('/', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const kelas = await Kelas.create(req.body);
  res.status(201).json({ success: true, data: kelas });
});

router.get('/:id/siswa', async (req: AuthRequest, res: Response): Promise<void> => {
  const siswaList = await Siswa.findAll({
    where: { kelas_id: req.params.id },
    include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash'] } }],
    order: [[{ model: User, as: 'user' }, 'nama', 'ASC']],
  });
  res.json({ success: true, data: siswaList });
});

router.get('/:id/jadwal', async (req: AuthRequest, res: Response): Promise<void> => {
  const jadwalList = await JadwalPelajaran.findAll({
    where: { kelas_id: req.params.id },
    include: [
      { model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
      { model: MataPelajaran, as: 'mata_pelajaran' },
    ],
    order: [['hari', 'ASC'], ['jam_mulai', 'ASC']],
  });
  res.json({ success: true, data: jadwalList });
});

export default router;
