import { Router, Response } from 'express';
import Groq from 'groq-sdk';
import { authenticate, AuthRequest } from '../middleware/auth';
import { User, Siswa, Guru, Kelas, JurnalGuru, Sekolah } from '../models';
import { QueryTypes } from 'sequelize';
import sequelize from '../config/database';

const router = Router();
router.use(authenticate);

async function getSchoolContext(): Promise<string> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const lines: string[] = [];

  lines.push(`TANGGAL: ${today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`);

  // Unit sekolah
  const sekolahList = await Sekolah.findAll({ attributes: ['nama', 'level'] }).catch(() => []);
  lines.push(`UNIT SEKOLAH: ${(sekolahList as any[]).map((s: any) => `${s.nama} (${s.level})`).join(', ')}`);

  // Ringkasan siswa
  const totalSiswa = await Siswa.count({ include: [{ model: User, as: 'user', where: { is_active: true } }] }).catch(() => null);
  lines.push(`TOTAL SISWA AKTIF: ${totalSiswa ?? 'data tidak tersedia'}`);

  // Siswa per kelas
  const siswaPerKelas = await sequelize.query<any>(
    `SELECT k.nama_kelas, sch.level, COUNT(s.id) AS jumlah
     FROM kelas k
     JOIN sekolah sch ON k.sekolah_id = sch.id
     LEFT JOIN siswa s ON s.kelas_id = k.id
     LEFT JOIN users u ON s.user_id = u.id AND u.is_active = true
     GROUP BY k.id, k.nama_kelas, sch.level
     ORDER BY sch.level, k.nama_kelas`,
    { type: QueryTypes.SELECT }
  ).catch(() => []);
  if ((siswaPerKelas as any[]).length > 0) {
    lines.push('SISWA PER KELAS:');
    for (const r of siswaPerKelas as any[]) {
      lines.push(`  - ${r.nama_kelas} (${r.level}): ${r.jumlah} siswa`);
    }
  }

  // Total guru & kelas
  const [totalGuru, totalKelas] = await Promise.all([
    Guru.count().catch(() => null),
    Kelas.count().catch(() => null),
  ]);
  lines.push(`TOTAL GURU: ${totalGuru ?? 'data tidak tersedia'}`);
  lines.push(`TOTAL KELAS: ${totalKelas ?? 'data tidak tersedia'}`);

  // Kehadiran hari ini — sumber sama dengan dashboard (tabel absensi, input guru)
  const absensiHariIni = await sequelize.query<any>(
    `SELECT status, COUNT(DISTINCT siswa_id) AS total FROM absensi WHERE tanggal = :tgl GROUP BY status`,
    { replacements: { tgl: todayStr }, type: QueryTypes.SELECT }
  ).catch(() => []);
  if ((absensiHariIni as any[]).length > 0) {
    const stat = (absensiHariIni as any[]).reduce((acc: any, r: any) => { acc[r.status] = parseInt(r.total); return acc; }, {});
    const hadir = stat.hadir || 0;
    const sakit = stat.sakit || 0;
    const izin = stat.izin || 0;
    const alfa = stat.alfa || 0;
    lines.push(`KEHADIRAN HARI INI: Hadir ${hadir}, Sakit ${sakit}, Izin ${izin}, Alfa ${alfa}`);
  } else {
    lines.push('KEHADIRAN HARI INI: belum ada data absensi hari ini');
  }

  // Absensi gerbang (gate scanner) — data terpisah dari absensi input guru
  const gerbang = await sequelize.query<any>(
    `SELECT COUNT(*) FILTER (WHERE ag.waktu_masuk IS NOT NULL) AS hadir, COUNT(s.id) AS total
     FROM siswa s JOIN users u ON s.user_id = u.id AND u.is_active = true
     LEFT JOIN absensi_gerbang ag ON ag.siswa_id = s.id AND ag.tanggal = :tgl`,
    { replacements: { tgl: todayStr }, type: QueryTypes.SELECT }
  ).catch(() => null);
  if (gerbang && (gerbang as any[])[0]) {
    const g = (gerbang as any[])[0];
    const hadir = parseInt(g.hadir) || 0;
    const total = parseInt(g.total) || 0;
    lines.push(`ABSENSI GERBANG HARI INI (scan QR): ${hadir} sudah scan masuk, ${total - hadir} belum scan, dari ${total} siswa aktif`);
  }

  // Jurnal guru
  const jurnalDraft = await JurnalGuru.count({ where: { status: 'draft' } }).catch(() => null);
  const jurnalSubmitted = await JurnalGuru.count({ where: { status: 'submitted' } }).catch(() => null);
  lines.push(`JURNAL GURU: ${jurnalDraft ?? '?'} draft belum submit, ${jurnalSubmitted ?? '?'} menunggu approval`);

  // Pembayaran
  const pembayaran = await sequelize.query<any>(
    `SELECT status, COUNT(*) AS total FROM pembayaran GROUP BY status`,
    { type: QueryTypes.SELECT }
  ).catch(() => []);
  if ((pembayaran as any[]).length > 0) {
    const p = (pembayaran as any[]).reduce((acc: any, r: any) => { acc[r.status] = parseInt(r.total); return acc; }, {});
    lines.push(`STATUS PEMBAYARAN: Lunas ${p.lunas || 0}, Sebagian ${p.sebagian || 0}, Belum bayar ${p.belum_bayar || 0}`);
  }

  return lines.join('\n');
}

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { message, history = [] } = req.body;
  if (!message) { res.status(400).json({ success: false, message: 'Pesan kosong' }); return; }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) { res.status(500).json({ success: false, message: 'AI belum dikonfigurasi' }); return; }

  const schoolContext = await getSchoolContext();

  const systemPrompt = `Kamu adalah Asisten AI Al Fakhir School untuk guru, admin, dan staf.

=== DATA REAL-TIME SISTEM ===
${schoolContext}
=== AKHIR DATA ===

ATURAN WAJIB — TIDAK BOLEH DILANGGAR:
1. Kamu HANYA boleh menjawab pertanyaan yang berkaitan dengan sistem Al Fakhir School: siswa, guru, kelas, absensi, jurnal, pembayaran, dan operasional sekolah.
2. Jika pertanyaan TIDAK berkaitan dengan sistem sekolah (contoh: resep masakan, berita, cuaca, pengetahuan umum, dll), TOLAK dengan sopan: "Saya hanya dapat membantu pertanyaan seputar sistem Al Fakhir School."
3. HANYA gunakan data dari bagian "DATA REAL-TIME SISTEM" di atas. JANGAN mengarang, JANGAN menebak, JANGAN menggunakan pengetahuan umum untuk mengisi angka atau fakta yang tidak ada dalam data.
4. Jika data yang ditanya TIDAK ADA dalam konteks, jawab: "Data tersebut tidak tersedia di sistem saat ini. Silakan cek langsung di dashboard."
5. Angka yang kamu sebut HARUS SAMA PERSIS dengan data di atas. Tidak boleh berbeda satu pun.
6. Jawab dalam Bahasa Indonesia, ringkas dan profesional.
7. Gunakan format bullet/angka jika data lebih dari 2 item.
8. PENTING: Jawab HANYA data yang ditanyakan. Jangan tampilkan data lain yang tidak relevan dengan pertanyaan. Contoh: jika ditanya soal jurnal, jangan sebut data siswa atau absensi.`;

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
      temperature: 0.1,
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
