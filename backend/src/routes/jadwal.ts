import { Router, Response } from 'express';
import { JadwalPelajaran, Guru, Kelas, Sekolah, MataPelajaran, User, Absensi, QrCodeSession } from '../models';
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
      { model: Kelas, as: 'kelas', include: [{ model: Sekolah, as: 'sekolah', attributes: ['level'] }] },
      { model: MataPelajaran, as: 'mata_pelajaran' },
    ],
    order: [['hari', 'ASC'], ['jam_mulai', 'ASC']],
  });

  res.json({ success: true, data: jadwalList });
});

// Guru bisa buat jadwal sendiri, admin bisa buat untuk siapapun
router.post('/', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let body = { ...req.body };
    // Guru: paksa guru_id ke diri sendiri
    if (req.user!.role === 'guru') {
      const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
      if (!guru) { res.status(400).json({ success: false, message: 'Data guru tidak ditemukan' }); return; }
      body.guru_id = (guru as any).id;
    }
    // Cegah duplikat: cek jadwal sama sudah ada
    const existing = await JadwalPelajaran.findOne({
      where: { guru_id: body.guru_id, kelas_id: body.kelas_id, hari: body.hari, jam_mulai: body.jam_mulai },
    });
    if (existing) {
      res.status(409).json({ success: false, message: 'Jadwal dengan guru, kelas, hari, dan jam yang sama sudah ada' });
      return;
    }
    const jadwal = await JadwalPelajaran.create(body);
    res.status(201).json({ success: true, data: jadwal });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Hanya admin atau guru pemilik yang bisa edit
router.put('/:id', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const jadwal = await JadwalPelajaran.findByPk(req.params.id as string);
  if (!jadwal) throw createError('Jadwal tidak ditemukan', 404);
  if (req.user!.role === 'guru') {
    const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
    if (!guru || (jadwal as any).guru_id !== (guru as any).id) {
      res.status(403).json({ success: false, message: 'Hanya bisa edit jadwal sendiri' }); return;
    }
  }
  await jadwal.update(req.body);
  res.json({ success: true, data: jadwal });
});

// Hanya admin atau guru pemilik yang bisa hapus
router.delete('/:id', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const jadwal = await JadwalPelajaran.findByPk(req.params.id as string);
  if (!jadwal) throw createError('Jadwal tidak ditemukan', 404);
  if (req.user!.role === 'guru') {
    const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
    if (!guru || (jadwal as any).guru_id !== (guru as any).id) {
      res.status(403).json({ success: false, message: 'Hanya bisa hapus jadwal sendiri' }); return;
    }
  }
  await QrCodeSession.destroy({ where: { jadwal_pelajaran_id: jadwal.id } });
  await Absensi.destroy({ where: { jadwal_pelajaran_id: jadwal.id } });
  await jadwal.destroy();
  res.json({ success: true, message: 'Jadwal berhasil dihapus' });
});

export default router;
