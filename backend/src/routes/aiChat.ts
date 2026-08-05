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

    const [totalSiswa, totalGuru, totalKelas, sekolahList, jurnalPending] = await Promise.all([
      Siswa.count({ include: [{ model: User, as: 'user', where: { is_active: true } }] }).catch(() => 0),
      Guru.count().catch(() => 0),
      Kelas.count().catch(() => 0),
      Sekolah.findAll({ attributes: ['nama', 'level'] }).catch(() => []),
      JurnalGuru.count({ where: { status: 'draft' } }).catch(() => 0),
    ]);

    // Absensi gerbang (gate scanner) — same source as dashboard
    const gerbangStats = await sequelize.query<any>(
      `SELECT
         COUNT(*) FILTER (WHERE ag.waktu_masuk IS NOT NULL) AS hadir,
         COUNT(s.id) AS total
       FROM siswa s
       JOIN users u ON s.user_id = u.id AND u.is_active = true
       LEFT JOIN absensi_gerbang ag ON ag.siswa_id = s.id AND ag.tanggal = :tgl`,
      { replacements: { tgl: todayStr }, type: 'SELECT' }
    ).catch(() => [{ hadir: 0, total: 0 }]);

    const gRow = (gerbangStats as any[])[0] || { hadir: 0, total: 0 };
    const hadirGerbang = parseInt(gRow.hadir) || 0;
    const totalSiswaAktif = parseInt(gRow.total) || 0;
    const belumHadir = totalSiswaAktif - hadirGerbang;

    return `
DATA SEKOLAH AL FAKHIR (${today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}):
- Unit sekolah: ${(sekolahList as any[]).map((s: any) => `${s.nama} (${s.level})`).join(', ')}
- Total siswa aktif terdaftar: ${totalSiswa}
- Total guru: ${totalGuru}
- Total kelas: ${totalKelas}
- Kehadiran hari ini (absensi gerbang): ${hadirGerbang} hadir dari ${totalSiswaAktif} siswa aktif (${belumHadir} belum hadir)
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
      ...(history as any[])
        .filter((h: any) => h.role === 'user' || h.role === 'assistant')
        .map((h: any) => ({
          role: h.role as 'user' | 'assistant',
          content: String(h.content),
        })),
      { role: 'user' as const, content: message },
    ];

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
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
