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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const absensiController = __importStar(require("../controllers/absensiController"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.post('/qr-session/create', (0, auth_1.authorize)('guru', 'admin'), absensiController.createQrSession);
router.post('/qr-session/:id/close', (0, auth_1.authorize)('guru', 'admin'), absensiController.closeQrSession);
router.post('/scan-qr', (0, auth_1.authorize)('siswa', 'guru', 'admin'), absensiController.scanQr);
router.post('/input-code', (0, auth_1.authorize)('siswa', 'guru', 'admin'), absensiController.inputCode);
router.post('/manual', (0, auth_1.authorize)('guru', 'admin'), absensiController.manualInput);
router.put('/:id', (0, auth_1.authorize)('guru', 'admin'), absensiController.update);
router.delete('/:id', (0, auth_1.authorize)('admin'), absensiController.remove);
router.get('/laporan', (0, auth_1.authorize)('admin', 'guru'), absensiController.getLaporan);
// Guru: persiapan absensi per jadwal (auto-fill dari gate), bulk submit
router.get('/persiapan-guru', (0, auth_1.authorize)('guru', 'admin'), absensiController.persiapanGuru);
router.post('/bulk-guru', (0, auth_1.authorize)('guru', 'admin'), absensiController.bulkGuru);
router.post('/bulk-kelas', (0, auth_1.authorize)('admin', 'guru'), absensiController.bulkKelas);
router.post('/izin-bulk', (0, auth_1.authorize)('guru', 'admin'), absensiController.izinBulk);
// Wali kelas: rekap kelas yang diampu
router.get('/wali-kelas', (0, auth_1.authorize)('guru', 'admin'), absensiController.rekapWaliKelas);
// Download rekap bulanan Excel
router.get('/rekap-download', (0, auth_1.authorize)('guru', 'admin'), absensiController.downloadRekap);
// JSON data preview rekap per mata pelajaran
router.get('/rekap-data', (0, auth_1.authorize)('guru', 'admin'), absensiController.rekapData);
router.get('/:siswa_id/detail', (0, auth_1.authorize)('admin', 'guru', 'siswa', 'ortu'), absensiController.getSiswaDetail);
exports.default = router;
