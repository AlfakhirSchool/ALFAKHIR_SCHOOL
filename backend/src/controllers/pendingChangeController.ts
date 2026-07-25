import { Response } from 'express';
import bcrypt from 'bcrypt';
import { AuthRequest } from '../middleware/auth';
import { PendingChange, User } from '../models';

export const requestChange = async (req: AuthRequest, res: Response): Promise<void> => {
  const { type, new_value, current_password } = req.body;
  const userId = req.user!.id;

  if (!type || !new_value) {
    res.status(400).json({ success: false, message: 'type dan new_value wajib diisi' });
    return;
  }
  if (!['password', 'nama'].includes(type)) {
    res.status(400).json({ success: false, message: 'type harus password atau nama' });
    return;
  }

  const user = await User.findByPk(userId);
  if (!user) { res.status(404).json({ success: false, message: 'User tidak ditemukan' }); return; }

  if (type === 'password') {
    if (!current_password) {
      res.status(400).json({ success: false, message: 'Password saat ini wajib diisi' });
      return;
    }
    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      res.status(400).json({ success: false, message: 'Password saat ini tidak benar' });
      return;
    }
    if (new_value.length < 6) {
      res.status(400).json({ success: false, message: 'Password baru minimal 6 karakter' });
      return;
    }
  }

  // Hapus pending lama yang belum diproses untuk tipe yang sama
  await PendingChange.destroy({ where: { user_id: userId, type, status: 'pending' } });

  const new_hash = type === 'password' ? await bcrypt.hash(new_value, 10) : null;

  await PendingChange.create({
    user_id: userId,
    type: type as 'password' | 'nama',
    new_value,
    current_password_hash: new_hash,
  });

  res.json({ success: true, message: `Permintaan ${type === 'password' ? 'ubah password' : 'ubah nama'} berhasil dikirim. Menunggu persetujuan Admin Master.` });
};

export const listPending = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status = 'pending' } = req.query;
  const statusStr = typeof status === 'string' ? status : 'pending';
  const items = await PendingChange.findAll({
    where: statusStr !== 'all' ? { status: statusStr as any } : {},
    include: [{ model: User, as: 'requester', attributes: ['id', 'nama', 'email', 'role'] }],
    order: [['created_at', 'DESC']],
  });
  res.json({ success: true, data: items });
};

export const reviewChange = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { action, catatan } = req.body; // action: 'approve' | 'reject'

  const item = await PendingChange.findByPk(id as string, {
    include: [{ model: User, as: 'requester' }],
  });
  if (!item) { res.status(404).json({ success: false, message: 'Request tidak ditemukan' }); return; }
  if (item.status !== 'pending') {
    res.status(400).json({ success: false, message: 'Request sudah diproses' });
    return;
  }

  if (action === 'approve') {
    const user = await User.findByPk(item.user_id);
    if (user) {
      if (item.type === 'password') {
        await (user as any).update({ password_hash: item.current_password_hash!, password_default: item.new_value });
      } else {
        await user.update({ nama: item.new_value });
      }
    }
    await item.update({ status: 'approved', reviewed_by: req.user!.id, reviewed_at: new Date(), catatan: catatan || null });
    res.json({ success: true, message: 'Permintaan disetujui dan perubahan diterapkan' });
  } else if (action === 'reject') {
    await item.update({ status: 'rejected', reviewed_by: req.user!.id, reviewed_at: new Date(), catatan: catatan || null });
    res.json({ success: true, message: 'Permintaan ditolak' });
  } else {
    res.status(400).json({ success: false, message: 'action harus approve atau reject' });
  }
};

export const myPending = async (req: AuthRequest, res: Response): Promise<void> => {
  const items = await PendingChange.findAll({
    where: { user_id: req.user!.id },
    order: [['created_at', 'DESC']],
    limit: 10,
  });
  res.json({ success: true, data: items });
};
