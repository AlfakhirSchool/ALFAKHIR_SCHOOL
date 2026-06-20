import { Router, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { Kelas, Sekolah, Guru, Siswa, User, JadwalPelajaran, MataPelajaran } from '../models';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getSekolahIdForLevel } from '../utils/levelFilter';

const router = Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { sekolah_id, tahun_ajaran } = req.query;
  const where: Record<string, unknown> = {};

  if (req.user?.role === 'guru') {
    // Guru hanya melihat kelas yang menjadi wali kelas atau mengajar via jadwal
    const guru = await Guru.findOne({ where: { user_id: req.user.id } });
    if (!guru) { res.json({ success: true, data: [] }); return; }

    where[Op.or as any] = [
      { wali_kelas_id: guru.id },
      sequelize.literal(
        `EXISTS (SELECT 1 FROM jadwal_pelajaran jp WHERE jp.kelas_id = "Kelas"."id" AND jp.guru_id = '${guru.id}')`
      ),
    ];
  } else if (req.user?.school_level) {
    // Admin jenjang hanya lihat kelas sekolahnya
    const sid = await getSekolahIdForLevel(req.user.school_level);
    where.sekolah_id = sid;
  } else if (sekolah_id) {
    where.sekolah_id = sekolah_id;
  }

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
  // Level admin hanya bisa tambah kelas di sekolahnya
  if (req.user?.school_level) {
    const sid = await getSekolahIdForLevel(req.user.school_level);
    req.body.sekolah_id = sid;
  }
  const kelas = await Kelas.create(req.body);
  res.status(201).json({ success: true, data: kelas });
});

router.put('/:id', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const kelas = await Kelas.findByPk(req.params.id as string, { include: [{ model: Sekolah, as: 'sekolah' }] });
  if (!kelas) { res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' }); return; }

  // Cek kepemilikan level
  if (req.user?.school_level && (kelas as any).sekolah?.level !== req.user.school_level) {
    res.status(403).json({ success: false, message: 'Akses ditolak' }); return;
  }
  await kelas.update(req.body);
  res.json({ success: true, data: kelas });
});

router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const kelas = await Kelas.findByPk(req.params.id as string, { include: [{ model: Sekolah, as: 'sekolah' }] });
  if (!kelas) { res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' }); return; }

  if (req.user?.school_level && (kelas as any).sekolah?.level !== req.user.school_level) {
    res.status(403).json({ success: false, message: 'Akses ditolak' }); return;
  }
  await kelas.destroy();
  res.json({ success: true, message: 'Kelas berhasil dihapus' });
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
