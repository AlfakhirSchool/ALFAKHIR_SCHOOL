import { Router, Response } from 'express';
import { AuthRequest, authenticate, authorize } from '../middleware/auth';
import { Kelas, Sekolah, Siswa } from '../models';
import { createSiswaWithAccount } from '../utils/createSiswaFromKandidat';

const router = Router();
router.use(authenticate);

const OBS_URL = process.env.OBSERVASI_API_URL || 'https://dashboard-alfakhir-seven.vercel.app';
const OBS_KEY = process.env.OBSERVASI_API_KEY || '';

async function fetchObservasi(path: string) {
  const res = await fetch(`${OBS_URL}${path}`, {
    headers: { 'x-api-key': OBS_KEY },
    next: { revalidate: 0 },
  } as any);
  if (!res.ok) throw new Error(`Observasi API error: ${res.status}`);
  return res.json();
}

// GET /api/observasi/kandidat?status=COMPLETED&level=SD
router.get('/kandidat', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status = 'COMPLETED', level } = req.query;
    const params = new URLSearchParams({ status: status as string });
    if (level) params.set('level', level as string);
    const data = await fetchObservasi(`/api/external/candidates?${params}`);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ success: false, message: 'Gagal mengambil data observasi: ' + err.message });
  }
});

// POST /api/observasi/daftarkan
// Body: { kandidat_id, nama, level, kelas_id, parentPhone?, parentEmail? }
router.post('/daftarkan', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { kandidat_id, nama, kelas_id, nisn, no_induk } = req.body;
    if (!nama || !kelas_id) {
      res.status(400).json({ success: false, message: 'nama dan kelas_id wajib diisi' });
      return;
    }

    if (!await Kelas.findByPk(kelas_id, { include: [{ model: Sekolah, as: 'sekolah' }] })) {
      res.status(404).json({ success: false, message: 'Kelas tidak ditemukan' });
      return;
    }

    // Cegah duplikat: kandidat yang sama tidak boleh didaftarkan 2x
    if (kandidat_id) {
      const existing = await Siswa.findOne({ where: { observasi_kandidat_id: kandidat_id } as any });
      if (existing) {
        res.status(409).json({ success: false, message: 'Kandidat ini sudah memiliki akun siswa' });
        return;
      }
    }

    const { email, password } = await createSiswaWithAccount({
      nama, kelas_id, nisn: nisn || null, nis: no_induk || null, no_induk: no_induk || null,
      observasi_kandidat_id: kandidat_id || null,
    });

    res.json({ success: true, message: `${nama} berhasil didaftarkan sebagai siswa`, email, password });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Gagal mendaftarkan siswa: ' + err.message });
  }
});

export default router;
