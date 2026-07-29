import { Request, Response } from 'express';
import { Op } from 'sequelize';
import User from '../models/User';
import JurnalGuru from '../models/JurnalGuru';
import Siswa from '../models/Siswa';
import Pembayaran from '../models/Pembayaran';
import Guru from '../models/Guru';
import Kelas from '../models/Kelas';
import { AuthRequest } from '../middleware/auth';

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

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = req.user?.role;
    const schoolLevel = req.user?.school_level;
    const notifications: { id: string; type: string; message: string; created_at: Date; read: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Jurnal submitted - perlu approval (admin only)
    if (role === 'admin') {
      const jurnalWhere: any = { status: 'submitted' };
      if (schoolLevel) {
        // Filter by school level via guru association
        const guruIds = await Guru.findAll({
          where: { school_levels: { [Op.contains]: [schoolLevel] } },
          attributes: ['id'],
        });
        if (guruIds.length > 0) {
          jurnalWhere.guru_id = { [Op.in]: guruIds.map((g: any) => g.id) };
        }
      }
      const jurnalSubmitted = await JurnalGuru.count({ where: jurnalWhere });
      if (jurnalSubmitted > 0) {
        notifications.push({
          id: 'jurnal-submitted',
          type: 'jurnal',
          message: `${jurnalSubmitted} jurnal guru menunggu approval`,
          created_at: new Date(),
          read: false,
        });
      }

      // Siswa baru hari ini
      const siswaWhere: any = { created_at: { [Op.gte]: today } };
      const siswaBaru = await Siswa.count({ where: siswaWhere });
      if (siswaBaru > 0) {
        notifications.push({
          id: 'siswa-baru',
          type: 'siswa',
          message: `${siswaBaru} siswa baru ditambahkan hari ini`,
          created_at: new Date(),
          read: false,
        });
      }

      // Pembayaran masuk hari ini (lunas)
      const pembayaranHariIni = await Pembayaran.count({
        where: { tanggal_bayar: { [Op.gte]: today }, status: 'lunas' },
      });
      if (pembayaranHariIni > 0) {
        notifications.push({
          id: 'pembayaran-masuk',
          type: 'pembayaran',
          message: `${pembayaranHariIni} pembayaran masuk hari ini`,
          created_at: new Date(),
          read: false,
        });
      }
    }

    // Guru: jurnal draft yang belum disubmit (lebih dari 3 hari)
    if (role === 'guru') {
      const guru = await Guru.findOne({ where: { user_id: req.user!.id }, attributes: ['id'] });
      if (guru) {
        const tiga_hari_lalu = new Date();
        tiga_hari_lalu.setDate(tiga_hari_lalu.getDate() - 3);
        const draftLama = await JurnalGuru.count({
          where: { guru_id: (guru as any).id, status: 'draft', created_at: { [Op.lt]: tiga_hari_lalu } },
        });
        if (draftLama > 0) {
          notifications.push({
            id: 'jurnal-draft-lama',
            type: 'jurnal',
            message: `${draftLama} jurnal draft belum disubmit (>3 hari)`,
            created_at: new Date(),
            read: false,
          });
        }
      }
    }

    res.json({
      success: true,
      data: notifications,
      pagination: { total: notifications.length, page: 1, limit: 20, totalPages: 1 },
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
