import { Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { User, Siswa, Guru, Kelas, Sekolah, Absensi, Nilai, Pembayaran, JurnalGuru, JadwalPelajaran } from '../models';
import { AuthRequest } from '../middleware/auth';

const getStatsForLevel = async (level: string): Promise<{ sekolahId?: string; namaSekolah?: string; totalSiswa: number; totalKelas: number; absensiHariIni: number }> => {
  const sekolah = await Sekolah.findOne({ where: { level } });
  if (!sekolah) return { totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };

  const kelasList = await Kelas.findAll({ where: { sekolah_id: sekolah.id }, attributes: ['id'] });
  const kelasIds = kelasList.map((k: any) => k.id as string);
  const totalKelas = kelasIds.length;

  if (totalKelas === 0) return { sekolahId: sekolah.id, namaSekolah: sekolah.nama, totalSiswa: 0, totalKelas: 0, absensiHariIni: 0 };

  const [totalSiswa, absensiHariIni] = await Promise.all([
    Siswa.count({ where: { kelas_id: { [Op.in]: kelasIds } } }) as Promise<number>,
    Absensi.count({
      where: { tanggal: new Date().toISOString().split('T')[0], status: 'hadir' },
      include: [{ model: Siswa, as: 'siswa', where: { kelas_id: { [Op.in]: kelasIds } }, attributes: [] }],
      distinct: true,
      col: 'siswa_id',
    }) as Promise<number>,
  ]);

  return { sekolahId: sekolah.id, namaSekolah: sekolah.nama, totalSiswa, totalKelas, absensiHariIni };
};

export const adminDashboard = async (_req: AuthRequest, res: Response): Promise<void> => {
  const today = new Date().toISOString().split('T')[0];

  const [sd, smp, sma, totalGuru, pendingJurnal] = await Promise.all([
    getStatsForLevel('SD'),
    getStatsForLevel('SMP'),
    getStatsForLevel('SMA'),
    Guru.count(),
    JurnalGuru.count({ where: { status: 'submitted' } }),
  ]);

  const totalSiswa = sd.totalSiswa + smp.totalSiswa + sma.totalSiswa;
  const totalKelas = sd.totalKelas + smp.totalKelas + sma.totalKelas;
  const absensiHariIni = sd.absensiHariIni + smp.absensiHariIni + sma.absensiHariIni;

  res.json({
    success: true,
    data: {
      kpi: { totalSiswa, totalGuru, totalKelas, absensiHariIni, pendingJurnal },
      sekolah: { sd, smp, sma },
    },
  });
};

export const guruDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const guru = await Guru.findOne({ where: { user_id: req.user!.id } });
  if (!guru) {
    res.json({ success: true, data: {} });
    return;
  }

  const hariMap: Record<number, string> = { 0: 'Minggu', 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat', 6: 'Sabtu' };
  const hariIni = hariMap[new Date().getDay()];

  const [jurnalBulanIni, jurnalPending, jadwalGuru] = await Promise.all([
    JurnalGuru.count({
      where: {
        guru_id: guru.id,
        tanggal: { [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    JurnalGuru.count({ where: { guru_id: guru.id, status: 'submitted' } }),
    JadwalPelajaran.findAll({ where: { guru_id: guru.id }, attributes: ['kelas_id', 'hari'] }),
  ]);

  const totalKelas = new Set((jadwalGuru as any[]).map((j: any) => j.kelas_id)).size;
  const jadwalHariIni = (jadwalGuru as any[]).filter((j: any) => j.hari === hariIni).length;

  res.json({
    success: true,
    data: {
      kpi: { jurnalBulanIni, jurnalPending, totalKelas, jadwalHariIni },
      school_levels: guru.school_levels || [],
    },
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
