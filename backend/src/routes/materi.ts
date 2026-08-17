import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../middleware/auth';
import { getMateri, uploadMateri, deleteMateri } from '../controllers/materiController';

const router = Router();
router.use(authenticate);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'materi');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.mp4', '.jpg', '.png'];
const ALLOWED_MIME = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument', 'application/vnd.ms-powerpoint', 'video/mp4', 'image/jpeg', 'image/png'];

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const extOk = ALLOWED_EXT.includes(ext);
    const mimeOk = ALLOWED_MIME.some(m => file.mimetype.startsWith(m));
    cb(null, extOk && mimeOk);
  },
});

router.get('/', getMateri);
router.post('/', authorize('guru', 'admin'), upload.single('file'), uploadMateri);
router.delete('/:id', authorize('guru', 'admin'), deleteMateri);

export default router;
