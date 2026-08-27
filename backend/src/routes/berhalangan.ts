import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { SiswaBerhalangan, Siswa, User, Kelas } from '../models';

const router = Router();
router.use(authenticate);

// List semua berhalangan (filter kelas, bulan/tahun)
router.get('/', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { kelas_id, bulan, tahun } = req.query;
  const where: any = {};

  if (kelas_id) {
    const siswaList = await Siswa.findAll({ where: { kelas_id: String(kelas_id) }, attributes: ['id'] });
    where.siswa_id = { [Op.in]: siswaList.map((s: any) => s.id) };
  }
  if (bulan && tahun) {
    const y = parseInt(tahun as string), m = parseInt(bulan as string);
    where.tanggal = { [Op.between]: [
      new Date(y, m - 1, 1).toISOString().split('T')[0],
      new Date(y, m, 0).toISOString().split('T')[0],
    ]};
  }

  const rows = await SiswaBerhalangan.findAll({
    where,
    include: [{ model: Siswa, as: 'siswa', include: [{ model: User, as: 'user', attributes: ['nama'] }, { model: Kelas, as: 'kelas', attributes: ['nama'] }] }],
    order: [['tanggal', 'DESC']],
  });
  res.json({ success: true, data: rows });
});

// List berhalangan per siswa
router.get('/siswa/:siswa_id', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const rows = await SiswaBerhalangan.findAll({
    where: { siswa_id: String(req.params.siswa_id) },
    order: [['tanggal', 'DESC']],
  });
  res.json({ success: true, data: rows });
});

// Upsert: catat atau update berhalangan pada tanggal tertentu
router.post('/', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id, tanggal, hari_ke, catatan } = req.body;
  if (!siswa_id || !tanggal) {
    res.status(400).json({ success: false, message: 'siswa_id dan tanggal wajib diisi' }); return;
  }
  const [record, created] = await SiswaBerhalangan.upsert({
    siswa_id, tanggal,
    hari_ke: hari_ke ? parseInt(hari_ke) : null,
    catatan: catatan || null,
    created_by: req.user!.id,
  });
  res.status(created ? 201 : 200).json({ success: true, data: record });
});

// Hapus
router.delete('/:id', authorize('admin', 'guru'), async (req: AuthRequest, res: Response): Promise<void> => {
  const record = await SiswaBerhalangan.findByPk(String(req.params.id));
  if (!record) { res.status(404).json({ success: false, message: 'Data tidak ditemukan' }); return; }
  await record.destroy();
  res.json({ success: true, message: 'Data dihapus' });
});

export default router;
