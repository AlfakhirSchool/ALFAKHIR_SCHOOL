import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Pelanggaran, Siswa, Guru, User, Kelas } from '../models';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id, kelas_id, start, end, page = '1', limit = '50' } = req.query;
  const limitN = Math.min(parseInt(limit as string) || 50, 200);
  const offset = (parseInt(page as string) - 1) * limitN;

  const where: any = {};
  if (siswa_id) where.siswa_id = siswa_id;
  if (start && end) where.tanggal = { [Op.between]: [start, end] };

  let siswaIds: string[] | null = null;
  if (kelas_id) {
    const siswaList = await Siswa.findAll({ where: { kelas_id: String(kelas_id) }, attributes: ['id'] });
    siswaIds = siswaList.map((s: any) => s.id);
    where.siswa_id = { [Op.in]: siswaIds };
  }

  const { count, rows } = await Pelanggaran.findAndCountAll({
    where,
    include: [
      { model: Siswa, as: 'siswa', include: [{ model: User, as: 'user', attributes: ['nama'] }, { model: Kelas, as: 'kelas', attributes: ['nama'] }] },
      { model: Guru, as: 'guru', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
    ],
    order: [['tanggal', 'DESC']],
    limit: limitN, offset,
  });

  res.json({ success: true, data: rows, pagination: { total: count, page: parseInt(page as string), limit: limitN } });
});

router.get('/rekap/:siswa_id', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const rows = await Pelanggaran.findAll({
    where: { siswa_id: req.params.siswa_id },
    order: [['tanggal', 'DESC']],
  });
  const total_poin = rows.reduce((sum: number, r: any) => sum + r.poin, 0);
  res.json({ success: true, data: rows, total_poin });
});

router.post('/', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id, jenis_pelanggaran, poin, keterangan, tanggal } = req.body;
  if (!siswa_id || !jenis_pelanggaran || poin === undefined || !tanggal) {
    res.status(400).json({ success: false, message: 'siswa_id, jenis_pelanggaran, poin, dan tanggal wajib diisi' }); return;
  }
  const guru = await Guru.findOne({ where: { user_id: req.user!.id }, attributes: ['id'] });
  const record = await Pelanggaran.create({
    siswa_id, jenis_pelanggaran, poin: parseInt(poin), keterangan: keterangan || null,
    tanggal, guru_id: guru ? (guru as any).id : null,
  });
  res.status(201).json({ success: true, data: record });
});

router.put('/:id', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const record = await Pelanggaran.findByPk(String(req.params.id));
  if (!record) { res.status(404).json({ success: false, message: 'Data tidak ditemukan' }); return; }
  const { jenis_pelanggaran, poin, keterangan, tanggal } = req.body;
  await record.update({ jenis_pelanggaran, poin: parseInt(poin), keterangan, tanggal });
  res.json({ success: true, data: record });
});

router.delete('/:id', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const record = await Pelanggaran.findByPk(String(req.params.id));
  if (!record) { res.status(404).json({ success: false, message: 'Data tidak ditemukan' }); return; }
  await record.destroy();
  res.json({ success: true, message: 'Data pelanggaran dihapus' });
});

export default router;
