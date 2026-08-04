import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { CatatanSiswaGuru, Guru, Siswa, User, Kelas } from '../models';
import { createError } from '../middleware/errorHandler';

const fotoDir = path.join(__dirname, '..', '..', 'uploads', 'catatan-siswa');
if (!fs.existsSync(fotoDir)) fs.mkdirSync(fotoDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, fotoDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan'));
  },
});

const router = Router();
router.use(authenticate);

// GET /catatan-siswa?siswa_id=&kelas_id=&page=&limit=
router.get('/', authorize('guru', 'admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: any = {};
  if (siswa_id) where.siswa_id = siswa_id;

  if (req.user!.role === 'guru') {
    const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
    if (guru) where.guru_id = guru.id;
  }

  const { count, rows } = await CatatanSiswaGuru.findAndCountAll({
    where,
    include: [
      { model: Siswa, as: 'siswa', include: [{ model: User, as: 'user', attributes: ['nama'] }, { model: Kelas, as: 'kelas', attributes: ['id', 'nama'] }] },
      { model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
    ],
    limit: parseInt(limit as string),
    offset,
    order: [['tanggal', 'DESC'], ['created_at', 'DESC']],
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page as string), limit: parseInt(limit as string) } });
});

// POST /catatan-siswa (with optional foto)
router.post('/', authorize('guru', 'admin'), upload.single('foto'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id, tanggal, judul, isi } = req.body;
  if (!siswa_id || !isi) { res.status(400).json({ success: false, message: 'siswa_id dan isi wajib diisi' }); return; }

  const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
  if (!guru && req.user!.role !== 'admin') throw createError('Data guru tidak ditemukan', 404);

  const foto_url = req.file ? `/uploads/catatan-siswa/${req.file.filename}` : null;

  const catatan = await CatatanSiswaGuru.create({
    siswa_id,
    guru_id: guru ? guru.id : req.body.guru_id,
    tanggal: tanggal || new Date().toISOString().split('T')[0],
    judul: judul || null,
    isi,
    foto_url,
  });

  res.status(201).json({ success: true, data: catatan });
});

// PUT /catatan-siswa/:id
router.put('/:id', authorize('guru', 'admin'), upload.single('foto'), async (req: AuthRequest, res: Response): Promise<void> => {
  const catatan = await CatatanSiswaGuru.findByPk(req.params.id);
  if (!catatan) throw createError('Catatan tidak ditemukan', 404);

  if (req.user!.role === 'guru') {
    const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
    if (!guru || catatan.guru_id !== guru.id) throw createError('Tidak berhak mengubah catatan ini', 403);
  }

  let foto_url = catatan.foto_url;
  if (req.file) {
    if (foto_url) {
      const oldPath = path.join(__dirname, '..', '..', foto_url.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    foto_url = `/uploads/catatan-siswa/${req.file.filename}`;
  }

  const { tanggal, judul, isi } = req.body;
  await catatan.update({ tanggal: tanggal || catatan.tanggal, judul: judul ?? catatan.judul, isi: isi || catatan.isi, foto_url });
  res.json({ success: true, data: catatan });
});

// DELETE /catatan-siswa/:id
router.delete('/:id', authorize('guru', 'admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const catatan = await CatatanSiswaGuru.findByPk(req.params.id);
  if (!catatan) throw createError('Catatan tidak ditemukan', 404);

  if (req.user!.role === 'guru') {
    const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
    if (!guru || catatan.guru_id !== guru.id) throw createError('Tidak berhak menghapus catatan ini', 403);
  }

  if (catatan.foto_url) {
    const p = path.join(__dirname, '..', '..', catatan.foto_url.replace(/^\//, ''));
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }

  await catatan.destroy();
  res.json({ success: true, message: 'Catatan berhasil dihapus' });
});

export default router;
