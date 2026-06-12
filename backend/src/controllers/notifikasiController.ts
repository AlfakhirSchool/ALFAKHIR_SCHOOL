import { Request, Response } from 'express';
import User from '../models/User';

export const registerFcmToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fcm_token, device_info } = req.body;
    const userId = (req as any).user?.id;

    if (!fcm_token) {
      res.status(400).json({ success: false, message: 'fcm_token wajib diisi' });
      return;
    }

    await User.update(
      { fcm_token, device_info: device_info || null } as any,
      { where: { id: userId } }
    );

    res.json({ success: true, message: 'FCM token berhasil disimpan' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menyimpan FCM token' });
  }
};

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { page = 1, limit = 20 } = req.query;

    res.json({
      success: true,
      data: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat notifikasi' });
  }
};

export const markRead = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, message: 'Notifikasi ditandai dibaca' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal update notifikasi' });
  }
};
