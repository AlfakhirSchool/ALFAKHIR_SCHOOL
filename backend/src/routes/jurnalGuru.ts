import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import * as jurnalController from '../controllers/jurnalGuruController';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { JurnalSiswa } from '../models';

const fotoDir = path.join(__dirname, '..', '..', 'uploads', 'jurnal-foto');
if (!fs.existsSync(fotoDir)) fs.mkdirSync(fotoDir, { recursive: true });

const uploadFoto = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, fotoDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan'));
  },
});

const router = Router();

router.use(authenticate);

router.post('/', authorize('guru', 'admin'), jurnalController.create);
router.get('/', authorize('admin', 'guru'), jurnalController.getAll);
router.get('/laporan/kelas/:id', authorize('admin', 'guru'), jurnalController.getLaporanKelas);
router.get('/siswa-riwayat/:siswa_id', authorize('guru', 'admin'), jurnalController.getRiwayatSiswa);
router.get('/download/excel', authorize('admin', 'guru'), jurnalController.downloadExcel);
router.get('/:id', authorize('admin', 'guru', 'ortu'), jurnalController.getById);
router.put('/:id', authorize('guru', 'admin'), jurnalController.update);
router.delete('/:id', authorize('admin', 'guru'), jurnalController.remove);
router.get('/:id/siswa', authorize('guru', 'admin'), jurnalController.getSiswaDetail);
router.put('/:id/siswa', authorize('guru', 'admin'), jurnalController.saveSiswaDetail);

// Upload foto untuk catatan siswa tertentu dalam jurnal
router.post('/:id/siswa/:siswa_id/foto', authorize('guru', 'admin'), uploadFoto.single('foto'), async (req: AuthRequest, res: Response): Promise<void> => {
  const file = req.file;
  if (!file) { res.status(400).json({ success: false, message: 'File foto tidak ditemukan' }); return; }

  const record = await JurnalSiswa.findOne({ where: { jurnal_id: req.params.id, siswa_id: req.params.siswa_id } });
  if (!record) { res.status(404).json({ success: false, message: 'Data siswa di jurnal ini tidak ditemukan' }); return; }

  // Hapus foto lama jika ada
  if (record.foto_url) {
    const oldPath = path.join(__dirname, '..', '..', record.foto_url.replace(/^\//, ''));
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const foto_url = `/uploads/jurnal-foto/${file.filename}`;
  await record.update({ foto_url });
  res.json({ success: true, data: { foto_url } });
});
router.post('/:id/submit', authorize('guru'), jurnalController.submit);
router.post('/:id/review', authorize('admin', 'guru'), jurnalController.review);
router.get('/:id/export/pdf', authorize('admin', 'guru'), jurnalController.exportPdf);

export default router;
