import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

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
import dashboardRoutes from './routes/dashboard';
import auditLogRoutes from './routes/auditLog';
import raporRoutes from './routes/rapor';
import notifikasiRoutes from './routes/notifikasi';
import { errorHandler, notFound } from './middleware/errorHandler';
import logger from './config/logger';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_GURU_URL || 'http://localhost:3000',
    process.env.FRONTEND_ADMIN_URL || 'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  credentials: true,
}));
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const PREFIX = process.env.API_PREFIX || '/api';

app.get(`${PREFIX}/health`, (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
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
app.use(`${PREFIX}/dashboard`, dashboardRoutes);
app.use(`${PREFIX}/audit-log`, auditLogRoutes);
app.use(`${PREFIX}/rapor`, raporRoutes);
app.use(`${PREFIX}/notifikasi`, notifikasiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
