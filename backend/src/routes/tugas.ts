import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import Tugas from '../models/Tugas';
import PengumpulanTugas from '../models/PengumpulanTugas';
import Guru from '../models/Guru';
import Siswa from '../models/Siswa';
import Kelas from '../models/Kelas';
import JadwalPelajaran from '../models/JadwalPelajaran';
import { User } from '../models';

const router = Router();
router.use(authenticate);

// ── Multer config ─────────────────────────────────────────────────────────────

const makeStorage = (subfolder: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(__dirname, '..', '..', 'uploads', subfolder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });

const uploadTugas  = multer({ storage: makeStorage('tugas'),  limits: { fileSize: 10 * 1024 * 1024 } });
const uploadJawaban = multer({ storage: makeStorage('jawaban'), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Helper ────────────────────────────────────────────────────────────────────

const getGuruId = async (userId: string): Promise<string | null> => {
  const guru = await Guru.findOne({ where: { user_id: userId }, attributes: ['id'] });
  return guru ? (guru as any).id : null;
};

const getSiswaId = async (userId: string): Promise<string | null> => {
  const siswa = await Siswa.findOne({ where: { user_id: userId }, attributes: ['id', 'kelas_id'] });
  return siswa ? (siswa as any).id : null;
};

// ── GURU: Buat tugas ──────────────────────────────────────────────────────────

router.post('/', authorize('guru', 'admin'), uploadTugas.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { judul, deskripsi, kelas_id, mata_pelajaran_id, deadline, max_nilai } = req.body;
    if (!judul || !kelas_id || !deadline) {
      res.status(400).json({ success: false, message: 'judul, kelas_id, dan deadline wajib diisi' });
      return;
    }

    const guruId = await getGuruId(req.user!.id);
    if (!guruId && req.user!.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Akun guru tidak ditemukan' });
      return;
    }

    // Verifikasi guru mengampu kelas ini via jadwal pelajaran (skip untuk admin)
    if (req.user!.role === 'guru') {
      if (!guruId) { res.status(403).json({ success: false, message: 'Akun guru tidak valid' }); return; }
      const jadwal = await JadwalPelajaran.findOne({ where: { kelas_id, guru_id: guruId as string } });
      if (!jadwal) {
        res.status(403).json({ success: false, message: 'Anda tidak mengampu kelas ini' });
        return;
      }
    }

    const tugas = await Tugas.create({
      judul,
      deskripsi: deskripsi || null,
      kelas_id,
      mata_pelajaran_id: mata_pelajaran_id || null,
      guru_id: guruId!,
      deadline: new Date(deadline),
      file_url: req.file ? `/uploads/tugas/${req.file.filename}` : null,
      file_name: req.file ? req.file.originalname : null,
      max_nilai: parseInt(max_nilai) || 100,
    });

    res.status(201).json({ success: true, data: tugas });
  } catch (e: any) {
    console.error('POST /tugas error:', e.message);
    res.status(500).json({ success: false, message: 'Gagal membuat tugas' });
  }
});

// ── List tugas per kelas ──────────────────────────────────────────────────────

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { kelas_id } = req.query;
    if (!kelas_id) { res.status(400).json({ success: false, message: 'kelas_id wajib' }); return; }

    // Siswa hanya boleh lihat tugas kelasnya sendiri
    if (req.user!.role === 'siswa') {
      const siswa = await Siswa.findOne({ where: { user_id: req.user!.id }, attributes: ['kelas_id'] });
      if (!siswa || (siswa as any).kelas_id !== kelas_id) {
        res.status(403).json({ success: false, message: 'Akses ditolak' });
        return;
      }
    }

    const tugasList = await Tugas.findAll({
      where: { kelas_id: String(kelas_id) },
      order: [['deadline', 'ASC']],
    });

    res.json({ success: true, data: tugasList });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat tugas' });
  }
});

// ── Detail tugas ──────────────────────────────────────────────────────────────

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tugas = await Tugas.findByPk(String(req.params.id));
    if (!tugas) { res.status(404).json({ success: false, message: 'Tugas tidak ditemukan' }); return; }

    res.json({ success: true, data: tugas });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat tugas' });
  }
});

// ── SISWA: Submit jawaban ─────────────────────────────────────────────────────

router.post('/:id/submit', authorize('siswa'), uploadJawaban.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tugas = await Tugas.findByPk(String(req.params.id));
    if (!tugas) { res.status(404).json({ success: false, message: 'Tugas tidak ditemukan' }); return; }

    if (new Date() > new Date((tugas as any).deadline)) {
      res.status(400).json({ success: false, message: 'Deadline sudah lewat, tidak bisa mengumpulkan' });
      return;
    }

    const siswaId = await getSiswaId(req.user!.id);
    if (!siswaId) { res.status(403).json({ success: false, message: 'Akun siswa tidak ditemukan' }); return; }

    const { catatan_siswa } = req.body;

    // Upsert — resubmit reset nilai
    const [record, created] = await PengumpulanTugas.upsert({
      tugas_id: req.params.id,
      siswa_id: siswaId,
      file_url: req.file ? `/uploads/jawaban/${req.file.filename}` : null,
      file_name: req.file ? req.file.originalname : null,
      catatan_siswa: catatan_siswa || null,
      nilai: null,
      catatan_guru: null,
      dinilai_at: null,
    } as any);

    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Tugas berhasil dikumpulkan' : 'Jawaban diperbarui, nilai sebelumnya direset',
      data: record,
    });
  } catch (e: any) {
    console.error('POST /tugas/:id/submit error:', e.message);
    res.status(500).json({ success: false, message: 'Gagal mengumpulkan tugas' });
  }
});

// ── GURU: Lihat semua submission tugas miliknya ───────────────────────────────

router.get('/:id/submissions', authorize('guru', 'admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tugas = await Tugas.findByPk(String(req.params.id));
    if (!tugas) { res.status(404).json({ success: false, message: 'Tugas tidak ditemukan' }); return; }

    // Guru hanya bisa lihat tugas miliknya sendiri
    if (req.user!.role === 'guru') {
      const guruId = await getGuruId(req.user!.id);
      if ((tugas as any).guru_id !== guruId) {
        res.status(403).json({ success: false, message: 'Bukan tugas Anda' });
        return;
      }
    }

    const submissions = await PengumpulanTugas.findAll({
      where: { tugas_id: req.params.id },
      include: [
        {
          model: Siswa,
          as: 'siswa',
          include: [{ model: User, as: 'user', attributes: ['nama'] }],
          attributes: ['id', 'nis', 'nisn'],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    res.json({ success: true, data: submissions });
  } catch (e: any) {
    console.error('GET /tugas/:id/submissions error:', e.message);
    res.status(500).json({ success: false, message: 'Gagal memuat submission' });
  }
});

// ── GURU: Beri nilai ──────────────────────────────────────────────────────────

router.put('/submissions/:submissionId/nilai', authorize('guru', 'admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nilai, catatan_guru } = req.body;
    if (nilai === undefined || nilai === null) {
      res.status(400).json({ success: false, message: 'nilai wajib diisi' });
      return;
    }

    const submission = await PengumpulanTugas.findByPk(String(req.params.submissionId), {
      include: [{ model: Tugas, as: 'tugas' }],
    });
    if (!submission) { res.status(404).json({ success: false, message: 'Submission tidak ditemukan' }); return; }

    const tugas = (submission as any).tugas;
    if (parseInt(nilai) > tugas.max_nilai) {
      res.status(400).json({ success: false, message: `Nilai tidak boleh melebihi max_nilai (${tugas.max_nilai})` });
      return;
    }

    // Guru hanya bisa nilai tugas miliknya
    if (req.user!.role === 'guru') {
      const guruId = await getGuruId(req.user!.id);
      if (tugas.guru_id !== guruId) {
        res.status(403).json({ success: false, message: 'Bukan tugas Anda' });
        return;
      }
    }

    await (submission as any).update({
      nilai: parseInt(nilai),
      catatan_guru: catatan_guru || null,
      dinilai_at: new Date(),
    });

    res.json({ success: true, message: 'Nilai berhasil disimpan', data: submission });
  } catch (e: any) {
    console.error('PUT /submissions/:id/nilai error:', e.message);
    res.status(500).json({ success: false, message: 'Gagal menyimpan nilai' });
  }
});

// ── SISWA: Lihat nilai tugasnya sendiri ──────────────────────────────────────

router.get('/:id/nilai-saya', authorize('siswa'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const siswaId = await getSiswaId(req.user!.id);
    if (!siswaId) { res.status(403).json({ success: false, message: 'Akun siswa tidak ditemukan' }); return; }

    const submission = await PengumpulanTugas.findOne({
      where: { tugas_id: String(req.params.id), siswa_id: siswaId },
    });

    res.json({ success: true, data: submission });
  } catch (e: any) {
    res.status(500).json({ success: false, message: 'Gagal memuat nilai' });
  }
});

export default router;
