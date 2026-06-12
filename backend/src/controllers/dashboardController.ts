import { Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { User, Siswa, Guru, Kelas, Absensi, Nilai, Pembayaran, JurnalGuru } from '../models';
import { AuthRequest } from '../middleware/auth';

export const adminDashboard = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [totalSiswa, totalGuru, totalKelas, absensiHariIni, pendingJurnal, tunggakanCount] = await Promise.all([
    Siswa.count(),
    Guru.count(),
    Kelas.count(),
    Absensi.count({ where: { tanggal: new Date().toISOString().split('T')[0] } }),
    JurnalGuru.count({ where: { status: 'submitted' } }),
    Pembayaran.count({ where: { status: { [Op.in]: ['belum_bayar', 'sebagian'] } } }),
  ]);

  res.json({
    success: true,
    data: {
      kpi: { totalSiswa, totalGuru, totalKelas, absensiHariIni, pendingJurnal, tunggakanCount },
    },
  });
};

export const guruDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
  if (!guru) {
    res.json({ success: true, data: {} });
    return;
  }

  const [jurnalBulanIni, jurnalPending] = await Promise.all([
    JurnalGuru.count({
      where: {
        guru_id: guru.id,
        tanggal: {
          [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    JurnalGuru.count({ where: { guru_id: guru.id, status: 'submitted' } }),
  ]);

  res.json({
    success: true,
    data: { kpi: { jurnalBulanIni, jurnalPending } },
  });
};

export const parentDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: { message: 'Parent dashboard - filtered by child' },
  });
};

export const studentDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const siswa = await Siswa.findOne({ where: { user_id: req.user!.id } });
  if (!siswa) {
    res.json({ success: true, data: {} });
    return;
  }

  const tahunAjaran = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  const [absensiSummary, nilaiList, pembayaranList] = await Promise.all([
    Absensi.findAll({
      where: { siswa_id: siswa.id },
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'total']],
      group: ['status'],
    }),
    Nilai.findAll({ where: { siswa_id: siswa.id, tahun_ajaran: tahunAjaran } }),
    Pembayaran.findAll({ where: { siswa_id: siswa.id, tahun_ajaran: tahunAjaran } }),
  ]);

  res.json({
    success: true,
    data: { absensi: absensiSummary, nilai: nilaiList, pembayaran: pembayaranList },
  });
};
