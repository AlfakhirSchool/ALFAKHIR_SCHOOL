"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const siswa_1 = __importDefault(require("./routes/siswa"));
const guru_1 = __importDefault(require("./routes/guru"));
const kelas_1 = __importDefault(require("./routes/kelas"));
const mataPelajaran_1 = __importDefault(require("./routes/mataPelajaran"));
const jadwal_1 = __importDefault(require("./routes/jadwal"));
const absensi_1 = __importDefault(require("./routes/absensi"));
const nilai_1 = __importDefault(require("./routes/nilai"));
const pembayaran_1 = __importDefault(require("./routes/pembayaran"));
const jurnalGuru_1 = __importDefault(require("./routes/jurnalGuru"));
const catatanSiswa_1 = __importDefault(require("./routes/catatanSiswa"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const auditLog_1 = __importDefault(require("./routes/auditLog"));
const users_1 = __importDefault(require("./routes/users"));
const rapor_1 = __importDefault(require("./routes/rapor"));
const notifikasi_1 = __importDefault(require("./routes/notifikasi"));
const deleteRequests_1 = __importDefault(require("./routes/deleteRequests"));
const absensiGerbang_1 = __importDefault(require("./routes/absensiGerbang"));
const rfid_1 = __importDefault(require("./routes/rfid"));
const feedback_1 = __importDefault(require("./routes/feedback"));
const pendingChanges_1 = __importDefault(require("./routes/pendingChanges"));
const observasi_1 = __importDefault(require("./routes/observasi"));
const kandidat_1 = __importDefault(require("./routes/kandidat"));
const catatanPewawancara_1 = __importDefault(require("./routes/catatanPewawancara"));
const soalAkademik_1 = __importDefault(require("./routes/soalAkademik"));
const jawabanForm_1 = __importDefault(require("./routes/jawabanForm"));
const pertanyaanForm_1 = __importDefault(require("./routes/pertanyaanForm"));
const aiChat_1 = __importDefault(require("./routes/aiChat"));
const tugas_1 = __importDefault(require("./routes/tugas"));
const materi_1 = __importDefault(require("./routes/materi"));
const errorHandler_1 = require("./middleware/errorHandler");
const auditLog_2 = require("./middleware/auditLog");
const logger_1 = __importDefault(require("./config/logger"));
const emailService_1 = require("./utils/emailService");
const pengumuman_1 = __importDefault(require("./routes/pengumuman"));
const transaksiKeuangan_1 = __importDefault(require("./routes/transaksiKeuangan"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((0, cors_1.default)({
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
        }
        else {
            callback(new Error(`CORS: origin tidak diizinkan: ${origin}`));
        }
    },
    credentials: true,
}));
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.default.info(message.trim()) },
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '..', 'uploads')));
app.use(auditLog_2.globalAuditLogger);
const PREFIX = process.env.API_PREFIX || '/api';
app.get(`${PREFIX}/health`, (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});
app.get(`${PREFIX}/health/email`, async (_req, res) => {
    const ok = await (0, emailService_1.testEmailConnection)();
    res.json({ smtp: ok ? 'connected' : 'not configured' });
});
app.use(`${PREFIX}/auth`, auth_1.default);
app.use(`${PREFIX}/siswa`, siswa_1.default);
app.use(`${PREFIX}/guru`, guru_1.default);
app.use(`${PREFIX}/kelas`, kelas_1.default);
app.use(`${PREFIX}/mata-pelajaran`, mataPelajaran_1.default);
app.use(`${PREFIX}/jadwal-pelajaran`, jadwal_1.default);
app.use(`${PREFIX}/absensi`, absensi_1.default);
app.use(`${PREFIX}/nilai`, nilai_1.default);
app.use(`${PREFIX}/pembayaran`, pembayaran_1.default);
app.use(`${PREFIX}/jurnal-guru`, jurnalGuru_1.default);
app.use(`${PREFIX}/catatan-siswa`, catatanSiswa_1.default);
app.use(`${PREFIX}/dashboard`, dashboard_1.default);
app.use(`${PREFIX}/audit-log`, auditLog_1.default);
app.use(`${PREFIX}/users`, users_1.default);
app.use(`${PREFIX}/rapor`, rapor_1.default);
app.use(`${PREFIX}/notifikasi`, notifikasi_1.default);
app.use(`${PREFIX}/delete-requests`, deleteRequests_1.default);
app.use(`${PREFIX}/absensi-gerbang`, absensiGerbang_1.default);
app.use(`${PREFIX}/rfid`, rfid_1.default);
app.use(`${PREFIX}/pending-changes`, pendingChanges_1.default);
app.use(`${PREFIX}/feedback`, feedback_1.default);
app.use(`${PREFIX}/observasi`, observasi_1.default);
app.use(`${PREFIX}/kandidat`, kandidat_1.default);
app.use(`${PREFIX}/catatan-pewawancara`, catatanPewawancara_1.default);
app.use(`${PREFIX}/soal-akademik`, soalAkademik_1.default);
app.use(`${PREFIX}/jawaban-form`, jawabanForm_1.default);
app.use(`${PREFIX}/pertanyaan-form`, pertanyaanForm_1.default);
app.use(`${PREFIX}/ai/chat`, aiChat_1.default);
app.use(`${PREFIX}/tugas`, tugas_1.default);
app.use(`${PREFIX}/materi`, materi_1.default);
app.use(`${PREFIX}/pengumuman`, pengumuman_1.default);
app.use(`${PREFIX}/keuangan/transaksi`, transaksiKeuangan_1.default);
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
exports.default = app;
