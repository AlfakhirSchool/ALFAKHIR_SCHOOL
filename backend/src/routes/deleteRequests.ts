import { Router, Response } from 'express';
import { QueryTypes } from 'sequelize';
import sequelize from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Kelas } from '../models';

const router = Router();
router.use(authenticate, authorize('admin'));

// Buat permintaan hapus (semua admin)
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { resource_type, resource_id, resource_name, reason } = req.body;
  if (!resource_type || !resource_id || !resource_name) {
    res.status(400).json({ success: false, message: 'resource_type, resource_id, resource_name wajib diisi' });
    return;
  }

  // Cek duplikat: sudah ada pending request untuk resource ini?
  const existing = await sequelize.query<{ id: string }>(
    `SELECT id FROM delete_requests WHERE resource_id = :rid AND status = 'pending' LIMIT 1`,
    { replacements: { rid: resource_id }, type: QueryTypes.SELECT }
  );
  if (existing.length > 0) {
    res.status(409).json({ success: false, message: 'Permintaan hapus untuk data ini sudah dikirim dan menunggu verifikasi Feri' });
    return;
  }

  await sequelize.query(
    `INSERT INTO delete_requests (requester_id, resource_type, resource_id, resource_name, reason)
     VALUES (:uid, :type, :rid, :rname, :reason)`,
    { replacements: { uid: req.user!.id, type: resource_type, rid: resource_id, rname: resource_name, reason: reason || null }, type: QueryTypes.INSERT }
  );

  res.status(201).json({ success: true, message: 'Permintaan hapus berhasil dikirim ke Feri untuk diverifikasi' });
});

// Daftar permintaan (master admin only)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.school_level) { res.status(403).json({ success: false, message: 'Hanya Admin Master yang dapat melihat permintaan hapus' }); return; }

  const { status = 'pending' } = req.query;
  const rows = await sequelize.query(
    `SELECT dr.*, u.nama AS requester_nama, u.school_level AS requester_jenjang,
            rv.nama AS reviewer_nama
     FROM delete_requests dr
     JOIN users u ON dr.requester_id = u.id
     LEFT JOIN users rv ON dr.reviewed_by = rv.id
     WHERE (:status = 'all' OR dr.status = :status)
     ORDER BY dr.created_at DESC
     LIMIT 50`,
    { replacements: { status }, type: QueryTypes.SELECT }
  );

  res.json({ success: true, data: rows });
});

// Setujui dan eksekusi hapus (master admin only)
router.put('/:id/approve', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.school_level) { res.status(403).json({ success: false, message: 'Hanya Admin Master' }); return; }

  const [dr] = await sequelize.query<any>(
    `SELECT * FROM delete_requests WHERE id = :id AND status = 'pending' LIMIT 1`,
    { replacements: { id: req.params.id }, type: QueryTypes.SELECT }
  );
  if (!dr) { res.status(404).json({ success: false, message: 'Permintaan tidak ditemukan atau sudah diproses' }); return; }

  // Eksekusi penghapusan berdasarkan resource_type
  try {
    if (dr.resource_type === 'kelas') {
      const kelas = await Kelas.findByPk(dr.resource_id as string);
      if (kelas) await kelas.destroy();
    } else {
      // Tabel dinamis yang aman (whitelist)
      const ALLOWED: Record<string, string> = { siswa: 'siswa', guru: 'guru', mata_pelajaran: 'mata_pelajaran' };
      const tbl = ALLOWED[dr.resource_type];
      if (!tbl) { res.status(400).json({ success: false, message: `Tipe resource '${dr.resource_type}' belum didukung` }); return; }
      await sequelize.query(`DELETE FROM ${tbl} WHERE id = :rid`, { replacements: { rid: dr.resource_id }, type: QueryTypes.DELETE });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, message: `Gagal menghapus: ${e.message}` });
    return;
  }

  await sequelize.query(
    `UPDATE delete_requests SET status = 'approved', reviewed_by = :uid, reviewed_at = NOW() WHERE id = :id`,
    { replacements: { uid: req.user!.id, id: req.params.id }, type: QueryTypes.UPDATE }
  );

  res.json({ success: true, message: `Data "${dr.resource_name}" berhasil dihapus` });
});

// Tolak permintaan hapus (master admin only)
router.put('/:id/reject', async (req: AuthRequest, res: Response): Promise<void> => {
  if (req.user?.school_level) { res.status(403).json({ success: false, message: 'Hanya Admin Master' }); return; }

  const result = await sequelize.query(
    `UPDATE delete_requests SET status = 'rejected', reviewed_by = :uid, reviewed_at = NOW()
     WHERE id = :id AND status = 'pending'`,
    { replacements: { uid: req.user!.id, id: req.params.id }, type: QueryTypes.UPDATE }
  );

  res.json({ success: true, message: 'Permintaan hapus ditolak' });
});

export default router;
