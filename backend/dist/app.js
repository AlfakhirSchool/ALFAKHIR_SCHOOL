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
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = __importDefault(require("./config/logger"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [
        process.env.FRONTEND_GURU_URL || 'http://localhost:3000',
        process.env.FRONTEND_ADMIN_URL || 'http://localhost:3001',
        'http://localhost:3000',
        'http://localhost:3001',
    ],
    credentials: true,
}));
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.default.info(message.trim()) },
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
const PREFIX = process.env.API_PREFIX || '/api';
app.get(`${PREFIX}/health`, (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
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
app.use(`${PREFIX}/dashboard`, dashboard_1.default);
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
exports.default = app;
