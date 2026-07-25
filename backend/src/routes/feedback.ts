import { Router, Response } from 'express';
import { Feedback, User } from '../models';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Kirim feedback (semua user)
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { kategori, judul, pesan, sumber } = req.body;
    if (!judul || !pesan || !kategori) { res.status(400).json({ success: false, message: 'Kategori, judul, dan pesan wajib diisi' }); return; }
    const fb = await Feedback.create({ user_id: req.user!.id, kategori, judul, pesan, sumber: sumber || 'web', status: 'baru' });
    res.status(201).json({ success: true, message: 'Feedback berhasil dikirim ke Admin Master', data: fb });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Lihat semua feedback (admin master only)
router.get('/', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, kategori } = req.query;
  const where: any = {};
  if (status) where.status = status;
  if (kategori) where.kategori = kategori;
  const list = await Feedback.findAll({
    where,
    include: [{ model: User, as: 'pengirim', attributes: ['nama', 'role', 'email'] }],
    order: [['created_at', 'DESC']],
  });
  res.json({ success: true, data: list });
});

// Balas feedback (admin master)
router.put('/:id/balas', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const fb = await Feedback.findByPk(req.params.id as string);
  if (!fb) { res.status(404).json({ success: false, message: 'Tidak ditemukan' }); return; }
  await (fb as any).update({ balasan: req.body.balasan, status: 'dibalas', dibalas_at: new Date() });
  res.json({ success: true, message: 'Balasan terkirim' });
});

// Tandai dibaca
router.patch('/:id/baca', authorize('admin'), async (req: AuthRequest, res: Response): Promise<void> => {
  const fb = await Feedback.findByPk(req.params.id as string);
  if (!fb) { res.status(404).json({ success: false, message: 'Tidak ditemukan' }); return; }
  if ((fb as any).status === 'baru') await (fb as any).update({ status: 'dibaca' });
  res.json({ success: true });
});

// Feedback milik sendiri (lihat balasan)
router.get('/mine', async (req: AuthRequest, res: Response): Promise<void> => {
  const list = await Feedback.findAll({ where: { user_id: req.user!.id }, order: [['created_at', 'DESC']] });
  res.json({ success: true, data: list });
});

export default router;
