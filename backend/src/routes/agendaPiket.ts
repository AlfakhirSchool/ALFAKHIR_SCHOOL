import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AgendaPiket, Guru, User } from '../models';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { start, end, guru_id, page = '1', limit = '30' } = req.query;
  const limitN = Math.min(parseInt(limit as string) || 30, 100);
  const offset = (parseInt(page as string) - 1) * limitN;
  const where: any = {};
  if (guru_id) where.guru_id = guru_id;
  if (start && end) where.tanggal = { [Op.between]: [start, end] };

  const { count, rows } = await AgendaPiket.findAndCountAll({
    where,
    include: [{ model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] }],
    order: [['tanggal', 'DESC']],
    limit: limitN, offset,
  });
  res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page as string), limit: limitN } });
});

router.get('/:id', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const record = await AgendaPiket.findByPk(String(req.params.id), {
    include: [{ model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] }],
  });
  if (!record) { res.status(404).json({ success: false, message: 'Agenda tidak ditemukan' }); return; }
  res.json({ success: true, data: record });
});

router.post('/', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { tanggal, keadaan_kbm, siswa_terlambat, guru_tidak_masuk, catatan, sekolah_id } = req.body;
  if (!tanggal) { res.status(400).json({ success: false, message: 'tanggal wajib diisi' }); return; }

  const guru = await Guru.findOne({ where: { user_id: req.user!.id }, attributes: ['id'] });
  if (!guru) { res.status(403).json({ success: false, message: 'Data guru tidak ditemukan' }); return; }

  const record = await AgendaPiket.create({
    guru_id: (guru as any).id,
    sekolah_id: sekolah_id || null,
    tanggal,
    keadaan_kbm: keadaan_kbm || null,
    siswa_terlambat: siswa_terlambat || [],
    guru_tidak_masuk: guru_tidak_masuk || [],
    catatan: catatan || null,
  });
  res.status(201).json({ success: true, data: record });
});

router.put('/:id', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const record = await AgendaPiket.findByPk(String(req.params.id));
  if (!record) { res.status(404).json({ success: false, message: 'Agenda tidak ditemukan' }); return; }
  const { keadaan_kbm, siswa_terlambat, guru_tidak_masuk, catatan } = req.body;
  await record.update({ keadaan_kbm, siswa_terlambat, guru_tidak_masuk, catatan });
  res.json({ success: true, data: record });
});

router.delete('/:id', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const record = await AgendaPiket.findByPk(String(req.params.id));
  if (!record) { res.status(404).json({ success: false, message: 'Agenda tidak ditemukan' }); return; }
  await record.destroy();
  res.json({ success: true, message: 'Agenda dihapus' });
});

export default router;
