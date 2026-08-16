"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const jurnalController = __importStar(require("../controllers/jurnalGuruController"));
const auth_1 = require("../middleware/auth");
const models_1 = require("../models");
const fotoDir = path_1.default.join(__dirname, '..', '..', 'uploads', 'jurnal-foto');
if (!fs_1.default.existsSync(fotoDir))
    fs_1.default.mkdirSync(fotoDir, { recursive: true });
const uploadFoto = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, fotoDir),
        filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path_1.default.extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/'))
            cb(null, true);
        else
            cb(new Error('Hanya file gambar yang diizinkan'));
    },
});
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/', (0, auth_1.authorize)('guru', 'admin'), jurnalController.create);
router.get('/', (0, auth_1.authorize)('admin', 'guru'), jurnalController.getAll);
router.get('/laporan/kelas/:id', (0, auth_1.authorize)('admin', 'guru'), jurnalController.getLaporanKelas);
router.get('/siswa-riwayat/:siswa_id', (0, auth_1.authorize)('guru', 'admin'), jurnalController.getRiwayatSiswa);
router.get('/download/excel', (0, auth_1.authorize)('admin', 'guru'), jurnalController.downloadExcel);
router.get('/:id', (0, auth_1.authorize)('admin', 'guru', 'ortu'), jurnalController.getById);
router.put('/:id', (0, auth_1.authorize)('guru', 'admin'), jurnalController.update);
router.delete('/:id', (0, auth_1.authorize)('admin', 'guru'), jurnalController.remove);
router.get('/:id/siswa', (0, auth_1.authorize)('guru', 'admin'), jurnalController.getSiswaDetail);
router.put('/:id/siswa', (0, auth_1.authorize)('guru', 'admin'), jurnalController.saveSiswaDetail);
// Upload foto untuk catatan siswa tertentu dalam jurnal
router.post('/:id/siswa/:siswa_id/foto', (0, auth_1.authorize)('guru', 'admin'), uploadFoto.single('foto'), async (req, res) => {
    const file = req.file;
    if (!file) {
        res.status(400).json({ success: false, message: 'File foto tidak ditemukan' });
        return;
    }
    const record = await models_1.JurnalSiswa.findOne({ where: { jurnal_id: req.params.id, siswa_id: req.params.siswa_id } });
    if (!record) {
        res.status(404).json({ success: false, message: 'Data siswa di jurnal ini tidak ditemukan' });
        return;
    }
    // Hapus foto lama jika ada
    if (record.foto_url) {
        const oldPath = path_1.default.join(__dirname, '..', '..', record.foto_url.replace(/^\//, ''));
        if (fs_1.default.existsSync(oldPath))
            fs_1.default.unlinkSync(oldPath);
    }
    const foto_url = `/uploads/jurnal-foto/${file.filename}`;
    await record.update({ foto_url });
    res.json({ success: true, data: { foto_url } });
});
router.post('/:id/submit', (0, auth_1.authorize)('guru'), jurnalController.submit);
router.post('/:id/review', (0, auth_1.authorize)('admin', 'guru'), jurnalController.review);
router.get('/:id/export/pdf', (0, auth_1.authorize)('admin', 'guru'), jurnalController.exportPdf);
exports.default = router;
