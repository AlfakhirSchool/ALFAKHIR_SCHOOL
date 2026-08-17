import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import siswaRoutes from './routes/siswa';
import guruRoutes from './routes/guru';
import kelasRoutes from './routes/kelas';
import mataPelajaranRoutes from './routes/mataPelajaran';
import jadwalRoutes from './routes/jadwal';
import absensiRoutes from './routes/absensi';
import nilaiRoutes from './routes/nilai';
import pembayaranRoutes from './routes/pembayaran';
import jurnalGuruRoutes from './routes/jurnalGuru';
import catatanSiswaRoutes from './routes/catatanSiswa';
import dashboardRoutes from './routes/dashboard';
import auditLogRoutes from './routes/auditLog';
import usersRoutes from './routes/users';
import raporRoutes from './routes/rapor';
import notifikasiRoutes from './routes/notifikasi';
import deleteRequestsRoutes from './routes/deleteRequests';
import absensiGerbangRoutes from './routes/absensiGerbang';
import rfidRoutes from './routes/rfid';
import feedbackRoutes from './routes/feedback';
import pendingChangesRoutes from './routes/pendingChanges';
import observasiRoutes from './routes/observasi';
import kandidatRoutes from './routes/kandidat';
import catatanPewawancaraRoutes from './routes/catatanPewawancara';
import soalAkademikRoutes from './routes/soalAkademik';
import jawabanFormRoutes from './routes/jawabanForm';
import pertanyaanFormRoutes from './routes/pertanyaanForm';
import aiChatRoutes from './routes/aiChat';
import tugasRoutes from './routes/tugas';
import materiRoutes from './routes/materi';
import { errorHandler, notFound } from './middleware/errorHandler';
import { globalAuditLogger } from './middleware/auditLog';
import logger from './config/logger';
import { testEmailConnection } from './utils/emailService';
import pengumumanRoutes from './routes/pengumuman';
import transaksiKeuanganRoutes from './routes/transaksiKeuangan';

dotenv.config();

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_ADMIN_URL,
      process.env.FRONTEND_GURU_URL,
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:3004',
      'http://localhost:3010',
      'http://localhost:3011',
      'http://localhost:3012',
      'http://localhost:3020',
      'http://localhost:3021',
      'http://localhost:3022',
      'http://10.10.9.73:3000',
      'http://10.10.9.73:3002',
      // Production Cloudflare domains
      'https://keuangan.smpialfakhir.sch.id',
      'https://pewawancara.smpialfakhir.sch.id',
      'https://guru.smpialfakhir.sch.id',
      'https://dashboard.smpialfakhir.sch.id',
    ].filter(Boolean);
    if (!origin || allowed.includes(origin) || origin?.endsWith('.smpialfakhir.sch.id') || origin?.endsWith('.alfakhirschool.sch.id') || (process.env.CLOUDFLARE_TUNNEL_TOKEN && origin?.endsWith('.trycloudflare.com'))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin tidak diizinkan: ${origin}`));
    }
  },
  credentials: true,
}));
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use(globalAuditLogger as any);

const PREFIX = process.env.API_PREFIX || '/api';

app.get(`${PREFIX}/health`, (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.get(`${PREFIX}/health/email`, async (_req, res) => {
  const ok = await testEmailConnection();
  res.json({ smtp: ok ? 'connected' : 'not configured' });
});

app.use(`${PREFIX}/auth`, authRoutes);
app.use(`${PREFIX}/siswa`, siswaRoutes);
app.use(`${PREFIX}/guru`, guruRoutes);
app.use(`${PREFIX}/kelas`, kelasRoutes);
app.use(`${PREFIX}/mata-pelajaran`, mataPelajaranRoutes);
app.use(`${PREFIX}/jadwal-pelajaran`, jadwalRoutes);
app.use(`${PREFIX}/absensi`, absensiRoutes);
app.use(`${PREFIX}/nilai`, nilaiRoutes);
app.use(`${PREFIX}/pembayaran`, pembayaranRoutes);
app.use(`${PREFIX}/jurnal-guru`, jurnalGuruRoutes);
app.use(`${PREFIX}/catatan-siswa`, catatanSiswaRoutes);
app.use(`${PREFIX}/dashboard`, dashboardRoutes);
app.use(`${PREFIX}/audit-log`, auditLogRoutes);
app.use(`${PREFIX}/users`, usersRoutes);
app.use(`${PREFIX}/rapor`, raporRoutes);
app.use(`${PREFIX}/notifikasi`, notifikasiRoutes);
app.use(`${PREFIX}/delete-requests`, deleteRequestsRoutes);
app.use(`${PREFIX}/absensi-gerbang`, absensiGerbangRoutes);
app.use(`${PREFIX}/rfid`, rfidRoutes);
app.use(`${PREFIX}/pending-changes`, pendingChangesRoutes);
app.use(`${PREFIX}/feedback`, feedbackRoutes);
app.use(`${PREFIX}/observasi`, observasiRoutes);
app.use(`${PREFIX}/kandidat`, kandidatRoutes);
app.use(`${PREFIX}/catatan-pewawancara`, catatanPewawancaraRoutes);
app.use(`${PREFIX}/soal-akademik`, soalAkademikRoutes);
app.use(`${PREFIX}/jawaban-form`, jawabanFormRoutes);
app.use(`${PREFIX}/pertanyaan-form`, pertanyaanFormRoutes);
app.use(`${PREFIX}/ai/chat`, aiChatRoutes);
app.use(`${PREFIX}/tugas`, tugasRoutes);
app.use(`${PREFIX}/materi`, materiRoutes);
app.use(`${PREFIX}/pengumuman`, pengumumanRoutes);
app.use(`${PREFIX}/keuangan/transaksi`, transaksiKeuanganRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
