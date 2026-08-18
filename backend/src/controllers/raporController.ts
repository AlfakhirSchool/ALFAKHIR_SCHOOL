import { Request, Response } from 'express';
import Rapor from '../models/Rapor';
import Siswa from '../models/Siswa';
import User from '../models/User';
import Nilai from '../models/Nilai';
import MataPelajaran from '../models/MataPelajaran';
import Kelas from '../models/Kelas';

const siswaWithUser = {
  model: User,
  as: 'user',
  where: { is_active: true, role: 'siswa' },
  attributes: ['id', 'nama', 'username'],
};

export const getRaporByKelas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kelas_id } = req.params;
    const { semester, tahun_ajaran } = req.query;

    const siswaList = await Siswa.findAll({
      where: { kelas_id },
      include: [siswaWithUser],
      attributes: ['id', 'nisn'],
      order: [[{ model: User, as: 'user' }, 'nama', 'ASC']],
    });

    const where: any = { siswa_id: siswaList.map(s => s.id) };
    if (semester) where.semester = Number(semester);
    if (tahun_ajaran) where.tahun_ajaran = tahun_ajaran;

    const raporList = await Rapor.findAll({
      where,
      include: [
        {
          model: Siswa,
          as: 'siswa',
          attributes: ['id', 'nisn'],
          include: [{ model: User, as: 'user', attributes: ['nama'] }],
        },
      ],
      order: [['nilai_rata_rata', 'DESC']],
    });

    res.json({ success: true, data: raporList });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat rapor' });
  }
};

export const generateRapor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { kelas_id, semester, tahun_ajaran } = req.body;

    if (!kelas_id || !semester || !tahun_ajaran) {
      res.status(400).json({ success: false, message: 'kelas_id, semester, tahun_ajaran wajib diisi' });
      return;
    }

    const siswaList = await Siswa.findAll({
      where: { kelas_id },
      include: [{ model: User, as: 'user', where: { is_active: true }, attributes: ['nama'] }],
      attributes: ['id', 'nisn'],
    });

    const nilaiList = await Nilai.findAll({
      where: {
        siswa_id: siswaList.map(s => s.id),
        semester: Number(semester),
        tahun_ajaran,
      },
      include: [{ model: MataPelajaran, as: 'mata_pelajaran', attributes: ['nama', 'kkm'] }],
    });

    const results = await Promise.all(
      siswaList.map(async (siswa) => {
        const nilaiSiswa = nilaiList.filter(n => n.siswa_id === siswa.id);
        const rataRata = nilaiSiswa.length > 0
          ? nilaiSiswa.reduce((sum, n) => sum + (Number(n.nilai_akhir) || 0), 0) / nilaiSiswa.length
          : 0;

        await Rapor.upsert({
          siswa_id: siswa.id,
          semester: Number(semester),
          tahun_ajaran,
          jumlah_hadir: 0,
          jumlah_sakit: 0,
          jumlah_izin: 0,
          jumlah_alfa: 0,
          nilai_rata_rata: Math.round(rataRata * 100) / 100,
          generated_at: new Date(),
        } as any);

        return {
          siswa_id: siswa.id,
          nama: (siswa as any).user?.nama || '',
          nilai_rata_rata: rataRata,
        };
      })
    );

    const ranked = results
      .sort((a, b) => b.nilai_rata_rata - a.nilai_rata_rata)
      .map((r, i) => ({ ...r, ranking: i + 1 }));

    for (const r of ranked) {
      await Rapor.update(
        { ranking: r.ranking },
        { where: { siswa_id: r.siswa_id, semester: Number(semester), tahun_ajaran } }
      );
    }

    res.json({
      success: true,
      message: `Rapor berhasil digenerate untuk ${results.length} siswa`,
      data: ranked,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Gagal generate rapor' });
  }
};

export const getRaporSiswa = async (req: Request, res: Response): Promise<void> => {
  try {
    const { siswa_id } = req.params;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (userRole === 'siswa') {
      const siswa = await Siswa.findOne({ where: { id: siswa_id }, attributes: ['user_id'] });
      if (siswa?.user_id !== userId) {
        res.status(403).json({ success: false, message: 'Akses ditolak' });
        return;
      }
    }

    const raporList = await Rapor.findAll({
      where: { siswa_id },
      include: [
        {
          model: Siswa,
          as: 'siswa',
          attributes: ['id', 'nisn'],
          include: [{ model: User, as: 'user', attributes: ['nama'] }],
        },
      ],
      order: [['tahun_ajaran', 'DESC'], ['semester', 'DESC']],
    });

    res.json({ success: true, data: raporList });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat rapor' });
  }
};
