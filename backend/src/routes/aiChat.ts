import { Router, Response } from 'express';
import Groq from 'groq-sdk';
import logger from '../config/logger';
import { authenticate, AuthRequest } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';
import { User, Siswa, Guru, Kelas, JurnalGuru, Sekolah } from '../models';
import { QueryTypes } from 'sequelize';
import sequelize from '../config/database';
import redis from '../config/redis';

const router = Router();
router.use(authenticate);

async function getSchoolContext(): Promise<string> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const cacheKey = `ai:school-context:${todayStr}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return cached;

  const lines: string[] = [];

  lines.push(`TANGGAL: ${today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`);

  // Unit sekolah
  const sekolahList = await Sekolah.findAll({ attributes: ['nama', 'level'] }).catch(() => []);
  lines.push(`UNIT SEKOLAH: ${(sekolahList as any[]).map((s: any) => `${s.nama} (${s.level})`).join(', ')}`);

  // Statistik per jenjang (sama dengan dashboard adminDashboard)
  const statsPerJenjang = await sequelize.query<any>(
    `SELECT
       sch.level,
       sch.nama AS nama_sekolah,
       COUNT(DISTINCT k.id) AS total_kelas,
       COUNT(DISTINCT s.id) AS total_siswa,
       COUNT(DISTINCT ab.siswa_id) FILTER (WHERE ab.tanggal = :tgl AND ab.status = 'hadir') AS hadir_hari_ini
     FROM sekolah sch
     LEFT JOIN kelas k ON k.sekolah_id = sch.id
     LEFT JOIN siswa s ON s.kelas_id = k.id
     LEFT JOIN absensi ab ON ab.siswa_id = s.id
     GROUP BY sch.id, sch.level, sch.nama
     ORDER BY sch.level`,
    { replacements: { tgl: todayStr }, type: QueryTypes.SELECT }
  ).catch(() => []);

  let totalSiswa = 0, totalKelasAll = 0, totalHadirAll = 0;
  for (const row of statsPerJenjang as any[]) {
    const s = parseInt(row.total_siswa) || 0;
    const k = parseInt(row.total_kelas) || 0;
    const h = parseInt(row.hadir_hari_ini) || 0;
    totalSiswa += s; totalKelasAll += k; totalHadirAll += h;
    lines.push(`UNIT ${row.level} (${row.nama_sekolah}): ${s} siswa, ${k} kelas, hadir hari ini ${h}`);
  }
  lines.push(`TOTAL SEMUA UNIT: ${totalSiswa} siswa, ${totalKelasAll} kelas, ${totalHadirAll} hadir hari ini`);

  // Siswa per kelas
  const siswaPerKelas = await sequelize.query<any>(
    `SELECT k.nama AS nama_kelas, sch.level, COUNT(s.id) AS jumlah
     FROM kelas k
     JOIN sekolah sch ON k.sekolah_id = sch.id
     LEFT JOIN siswa s ON s.kelas_id = k.id
     LEFT JOIN users u ON s.user_id = u.id AND u.is_active = true
     GROUP BY k.id, k.nama, sch.level
     ORDER BY sch.level, k.nama`,
    { type: QueryTypes.SELECT }
  ).catch(() => []);
  if ((siswaPerKelas as any[]).length > 0) {
    lines.push('SISWA PER KELAS:');
    for (const r of siswaPerKelas as any[]) {
      lines.push(`  - ${r.nama_kelas} (${r.level}): ${r.jumlah} siswa`);
    }
  }

  // Total guru
  const totalGuru = await Guru.count().catch(() => null);
  lines.push(`TOTAL GURU: ${totalGuru ?? 'data tidak tersedia'}`);

  // Kehadiran hari ini detail per status (sumber sama dengan dashboard)
  const absensiHariIni = await sequelize.query<any>(
    `SELECT status, COUNT(DISTINCT siswa_id) AS total FROM absensi WHERE tanggal = :tgl GROUP BY status`,
    { replacements: { tgl: todayStr }, type: QueryTypes.SELECT }
  ).catch(() => []);
  if ((absensiHariIni as any[]).length > 0) {
    const stat = (absensiHariIni as any[]).reduce((acc: any, r: any) => { acc[r.status] = parseInt(r.total); return acc; }, {});
    lines.push(`KEHADIRAN HARI INI (detail): Hadir ${stat.hadir || 0}, Sakit ${stat.sakit || 0}, Izin ${stat.izin || 0}, Alfa ${stat.alfa || 0}`);
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

  const context = lines.join('\n');
  // cache 5 menit — cukup segar untuk AI, hemat 8 query per chat message
  redis.setex(cacheKey, 300, context).catch(() => {});
  return context;
}

router.post('/', rateLimiter(20, 60 * 1000), async (req: AuthRequest, res: Response): Promise<void> => {
  const { message, history = [] } = req.body;
  if (!message) { res.status(400).json({ success: false, message: 'Pesan kosong' }); return; }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) { res.status(500).json({ success: false, message: 'AI belum dikonfigurasi' }); return; }

  const schoolContext = await getSchoolContext();

  const systemPrompt = `Kamu adalah Asisten AI Al Fakhir School — asisten cerdas untuk guru, admin, dan staf SD & SMP Islam Modern Al Fakhir, Sawangan, Depok.

Kamu punya DUA kemampuan utama:

## 1. DATA REAL-TIME SISTEM
Berikut data terkini dari sistem sekolah:

=== DATA REAL-TIME SISTEM ===
${schoolContext}
=== AKHIR DATA ===

Aturan untuk pertanyaan tentang data sistem:
- Gunakan HANYA angka dari data di atas. Jangan mengarang atau menebak.
- Angka harus SAMA PERSIS dengan data. Tidak boleh berbeda satu pun.
- Jika data tidak ada dalam konteks, jawab: "Data tersebut tidak tersedia di sistem saat ini."
- Jawab HANYA data yang ditanyakan. Jangan tampilkan data lain yang tidak relevan.

## 2. BANTUAN PENDIDIKAN & MENGAJAR
Kamu dapat membantu guru dengan semua kebutuhan mengajar, termasuk:
- Membuat Modul Ajar / RPP (Rencana Pelaksanaan Pembelajaran) sesuai Kurikulum Merdeka
- Membuat soal ulangan, PTS, PAS, kuis (pilihan ganda, essay, isian)
- Membuat silabus, program semester, program tahunan
- Membuat materi pembelajaran, ringkasan materi, penjelasan konsep
- Membuat rubrik penilaian, lembar observasi
- Membuat catatan perkembangan siswa
- Saran strategi mengajar, metode pembelajaran aktif
- Membuat soal diferensiasi untuk siswa dengan kemampuan berbeda
- Membuat jurnal refleksi guru
- Terjemahan materi, penyederhanaan bahasa untuk siswa SD/SMP

Aturan untuk bantuan pendidikan:
- Sesuaikan dengan jenjang SD atau SMP sesuai konteks pertanyaan
- Gunakan kurikulum yang berlaku di Indonesia (Kurikulum Merdeka / K13)
- Bahasa harus sesuai usia siswa (SD: sederhana, SMP: lebih formal)
- Format output yang diminta (tabel, daftar, narasi) diikuti

## ATURAN UMUM
- Bahasa Indonesia, profesional dan ramah
- Tolak permintaan yang tidak ada hubungannya sama sekali dengan pendidikan atau operasional sekolah (contoh: resep masakan, berita politik, dll)
- Gunakan format bullet/tabel jika data lebih dari 2 item`;

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
    logger.error({ event: 'groq_ai_error', error: e?.message });
    const status = e?.status === 429 ? 503 : 500;
    const msg = status === 503
      ? 'Kuota AI sedang penuh, coba beberapa menit lagi'
      : 'AI gagal merespons, coba lagi';
    res.status(status).json({ success: false, message: msg });
  }
});

export default router;
