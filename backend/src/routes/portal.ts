import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Siswa, Kelas, MataPelajaran, Pembayaran, Tugas } from '../models';
import Pengumuman from '../models/Pengumuman';
import redis from '../config/redis';

const router = Router();
router.use(authenticate);

// Single endpoint: semua data yang dibutuhkan halaman beranda portal siswa
router.get('/dashboard', authorize('siswa'), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const cacheKey = `portal:dashboard:${userId}`;

  // Cek cache Redis dulu
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.json(JSON.parse(cached));
      return;
    }
  } catch { /* redis down, lanjut ke DB */ }

  // 1. Data siswa + kelas (satu query)
  const siswa = await Siswa.findOne({
    where: { user_id: userId },
    include: [{ model: Kelas, as: 'kelas', attributes: ['id', 'nama'] }],
  }) as any;

  if (!siswa) {
    res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan' });
    return;
  }

  const siswaId = siswa.id;
  const kelasId = siswa.kelas_id;

  // 2. Parallel: tagihan, tugas, mapel, pengumuman
  const [tagihan, tugas, mapel, pengumuman] = await Promise.all([
    Pembayaran.findAll({
      where: { siswa_id: siswaId },
      order: [['tanggal_jatuh_tempo', 'ASC']],
    }),
    kelasId
      ? Tugas.findAll({
          where: { kelas_id: kelasId },
          order: [['deadline', 'ASC']],
        })
      : Promise.resolve([]),
    MataPelajaran.findAll({ order: [['nama', 'ASC']] }),
    Pengumuman.findAll({
      order: [['tanggal_publish', 'DESC']],
      limit: 5,
    }),
  ]);

  const payload = {
    success: true,
    data: {
      siswa,
      tagihan,
      tugas,
      mapel,
      pengumuman,
    },
  };

  // Cache 2 menit — data per-siswa (tagihan/tugas bisa berubah)
  try {
    await redis.setex(cacheKey, 120, JSON.stringify(payload));
  } catch { /* ignore */ }

  res.json(payload);
});

export default router;
