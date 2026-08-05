import { Router, Response } from 'express';
import Groq from 'groq-sdk';
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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) { res.status(500).json({ success: false, message: 'AI belum dikonfigurasi' }); return; }

  const schoolContext = await getSchoolContext();

  const systemPrompt = `Kamu adalah Asisten AI Al Fakhir School — asisten pintar untuk guru, admin, dan staf sekolah Al Fakhir.

${schoolContext}

PEDOMAN:
- Jawab dalam Bahasa Indonesia yang ramah, ringkas, dan profesional
- Fokus pada konteks sekolah: siswa, absensi, nilai, jadwal, jurnal, dan administrasi
- Kalau pertanyaan di luar konteks sekolah, tetap bantu tapi ingatkan fokus utama
- Jangan buat data jika tidak tersedia — katakan data perlu dicek langsung di sistem
- Gunakan format yang mudah dibaca (bullet, angka) jika perlu`;

  try {
    const client = new Groq({ apiKey });

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(history as any[]).map((h: any) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1024,
      messages,
    });

    const text = response.choices[0]?.message?.content || '';
    res.json({ success: true, data: { reply: text } });
  } catch (e: any) {
    console.error('Groq AI error:', e?.message);
    const status = e?.status === 429 ? 503 : 500;
    const msg = status === 503
      ? 'Kuota AI sedang penuh, coba beberapa menit lagi'
      : 'AI gagal merespons, coba lagi';
    res.status(status).json({ success: false, message: msg });
  }
});

export default router;
