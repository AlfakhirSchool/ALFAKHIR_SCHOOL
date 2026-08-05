import { Router, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { Kelas, Sekolah, Guru, Siswa, User, JadwalPelajaran, MataPelajaran } from '../models';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getSekolahIdForLevel } from '../utils/levelFilter';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'guru', 'keuangan'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
  const { sekolah_id, tahun_ajaran, jenjang } = req.query;
  const where: Record<string, unknown> = {};
  const sekolahWhere: Record<string, unknown> = {};

  if (req.user?.role === 'guru' && !req.query.all) {
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
  } else if (jenjang) {
    // Master admin filter by jenjang via sekolah.level
    sekolahWhere.level = jenjang as string;
  }

  if (tahun_ajaran) where.tahun_ajaran = tahun_ajaran;

  const kelasList = await Kelas.findAll({
    where,
    include: [
      { model: Sekolah, as: 'sekolah', where: Object.keys(sekolahWhere).length ? sekolahWhere : undefined },
      { model: Guru, as: 'wali_kelas', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
    ],
    order: [['tingkat', 'ASC'], ['nama', 'ASC']],
  });

  res.json({ success: true, data: kelasList });
  } catch (e: any) { res.status(500).json({ success: false, message: e.message || 'Gagal memuat kelas' }); }
});

router.post('/', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.school_level) {
    const sid = await getSekolahIdForLevel(req.user.school_level);
    req.body.sekolah_id = sid;
  }
  // Auto-resolve sekolah_id dari tingkat jika tidak dikirim
  if (!req.body.sekolah_id && req.body.tingkat) {
    const tingkat = parseInt(req.body.tingkat);
    const level = tingkat <= 6 ? 'SD' : tingkat <= 9 ? 'SMP' : 'SMA';
    const sekolah = await Sekolah.findOne({ where: { level } });
    if (sekolah) req.body.sekolah_id = (sekolah as any).id;
  }
  const existing = await Kelas.findOne({ where: { nama: req.body.nama, sekolah_id: req.body.sekolah_id, tahun_ajaran: req.body.tahun_ajaran } });
  if (existing) {
    res.status(409).json({ success: false, message: `Kelas "${req.body.nama}" sudah ada di sekolah ini untuk tahun ajaran ${req.body.tahun_ajaran}` });
    return;
  }
  if (!req.body.wali_kelas_id) req.body.wali_kelas_id = null;
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
  const { sekolah_id, ...rest } = req.body;
  const updateData: any = { ...rest };
  if (sekolah_id) updateData.sekolah_id = sekolah_id;
  if (!updateData.wali_kelas_id) updateData.wali_kelas_id = null;
  await kelas.update(updateData);
  res.json({ success: true, data: kelas });
});

router.delete('/:id', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const kelas = await Kelas.findByPk(req.params.id as string, { include: [{ model: Sekolah, as: 'sekolah' }] });
  if (!kelas) { res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' }); return; }

  if (req.user?.school_level && (kelas as any).sekolah?.level !== req.user.school_level) {
    res.status(403).json({ success: false, message: 'Akses ditolak' }); return;
  }
  const siswaCount = await Siswa.count({ where: { kelas_id: kelas.id } });
  if (siswaCount > 0) {
    res.status(409).json({ success: false, message: `Tidak bisa hapus: kelas masih memiliki ${siswaCount} siswa` }); return;
  }
  await kelas.destroy();
  res.json({ success: true, message: 'Kelas berhasil dihapus' });
});

router.get('/:id/siswa', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const siswaList = await Siswa.findAll({
    where: { kelas_id: req.params.id },
    include: [{ model: User, as: 'user', attributes: { exclude: ['password_hash', 'password_default'] } }],
    order: [[{ model: User, as: 'user' }, 'nama', 'ASC']],
  });
  res.json({ success: true, data: siswaList });
});

router.get('/:id/jadwal', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
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
