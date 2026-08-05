import { Router, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authenticate, AuthRequest } from '../middleware/auth';
import { User, Siswa, Guru, Kelas, JurnalGuru, Absensi, Sekolah } from '../models';
import { Op } from 'sequelize';
import sequelize from '../config/database';

const router = Router();
router.use(authenticate);

async function getSchoolContext(): Promise<string> {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

    const [totalSiswa, totalGuru, totalKelas, sekolahList, absensiHariIni, jurnalPending] = await Promise.all([
      Siswa.count({ include: [{ model: User, as: 'user', where: { is_active: true } }] }),
      Guru.count(),
      Kelas.count(),
      Sekolah.findAll({ attributes: ['nama', 'level'] }),
      Absensi.count({ where: { tanggal: todayStr } }),
      JurnalGuru.count({ where: { status: 'draft' } }),
    ]);

    const absensiStats = await (sequelize.query as any)(
      `SELECT status, COUNT(*) as total FROM absensi WHERE tanggal = :today GROUP BY status`,
      { replacements: { today: todayStr }, type: 'SELECT' }
    ).catch(() => []);

    const hadir = absensiStats.find((r: any) => r.status === 'hadir')?.total || 0;
    const sakit = absensiStats.find((r: any) => r.status === 'sakit')?.total || 0;
    const izin  = absensiStats.find((r: any) => r.status === 'izin')?.total || 0;
    const alfa  = absensiStats.find((r: any) => r.status === 'alfa')?.total || 0;

    return `
DATA SEKOLAH AL FAKHIR (${today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}):
- Unit sekolah: ${sekolahList.map((s: any) => `${s.nama} (${s.level})`).join(', ')}
- Total siswa aktif: ${totalSiswa}
- Total guru: ${totalGuru}
- Total kelas: ${totalKelas}
- Absensi hari ini: Hadir ${hadir}, Sakit ${sakit}, Izin ${izin}, Alfa ${alfa}, Total tercatat ${absensiHariIni}
- Jurnal guru belum submit: ${jurnalPending}
    `.trim();
  } catch {
    return 'Data sekolah Al Fakhir School (SD & SMP Islam Modern, Sawangan, Depok, Yayasan Prestasi Belia Indonesia).';
  }
}

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { message, history = [] } = req.body;
  if (!message) { res.status(400).json({ success: false, message: 'Pesan kosong' }); return; }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { res.status(500).json({ success: false, message: 'AI belum dikonfigurasi' }); return; }

  const schoolContext = await getSchoolContext();

  const systemInstruction = `Kamu adalah Asisten AI Al Fakhir School — asisten pintar untuk guru, admin, dan staf sekolah Al Fakhir.

${schoolContext}

PEDOMAN:
- Jawab dalam Bahasa Indonesia yang ramah, ringkas, dan profesional
- Fokus pada konteks sekolah: siswa, absensi, nilai, jadwal, jurnal, dan administrasi
- Kalau pertanyaan di luar konteks sekolah, tetap bantu tapi ingatkan fokus utama
- Jangan buat data jika tidak tersedia — katakan data perlu dicek langsung di sistem
- Gunakan format yang mudah dibaca (bullet, angka) jika perlu`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction,
    });

    const chat = model.startChat({
      history: (history as any[]).map(h => ({
        role: h.role,
        parts: [{ text: h.content }],
      })),
    });

    const result = await chat.sendMessage(message);
    const text = result.response.text();

    res.json({ success: true, data: { reply: text } });
  } catch (e: any) {
    console.error('Gemini error:', e?.message);
    const status = e?.status === 429 || String(e?.message).includes('429') ? 503 : 500;
    const msg = status === 503
      ? 'Kuota AI sedang penuh, coba beberapa menit lagi'
      : 'AI gagal merespons, coba lagi';
    res.status(status).json({ success: false, message: msg });
  }
});

export default router;
