import { Response } from 'express';
import { Op, QueryTypes } from 'sequelize';
import sequelize from '../config/database';
import { TransaksiKeuangan } from '../models';
import { AuthRequest } from '../middleware/auth';

export const KATEGORI_PEMASUKAN = ['SPP', 'Ekskul', 'UKT', 'Uang Masuk', 'Formulir Pendaftaran', 'Lainnya'];
export const KATEGORI_PENGELUARAN = ['Pengeluaran Harian', 'Pembayaran Kas', 'Transfer', 'Pengeluaran Operasional', 'Lainnya'];
export const SUB_KATEGORI_EKSKUL = ['Panahan', 'Robotik', 'Ekskul Kelas 9', 'Lainnya'];

export const getTransaksi = async (req: AuthRequest, res: Response): Promise<void> => {
  const { tipe, kategori, unit, metode, bulan, tahun, page = '1', limit = '30' } = req.query;

  const where: Record<string, unknown> = {};
  if (tipe) where.tipe = tipe;
  if (kategori) where.kategori = kategori;
  if (unit) where.unit = unit;
  if (metode) where.metode = metode;

  if (bulan && tahun) {
    const y = parseInt(tahun as string);
    const m = parseInt(bulan as string);
    const start = new Date(y, m - 1, 1).toISOString().split('T')[0];
    const end   = new Date(y, m, 0).toISOString().split('T')[0];
    where.tanggal = { [Op.between]: [start, end] };
  } else if (tahun) {
    const y = parseInt(tahun as string);
    where.tanggal = { [Op.between]: [`${y}-01-01`, `${y}-12-31`] };
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
  const offset = (pageNum - 1) * limitNum;

  const { count, rows } = await TransaksiKeuangan.findAndCountAll({
    where,
    order: [['tanggal', 'DESC'], ['created_at', 'DESC']],
    limit: limitNum,
    offset,
  });

  res.json({
    success: true,
    data: rows,
    pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) },
  });
};

export const createTransaksi = async (req: AuthRequest, res: Response): Promise<void> => {
  const { tanggal, tipe, kategori, sub_kategori, unit, jumlah, keterangan, metode, nama_pihak } = req.body;

  if (!tanggal || !tipe || !kategori || !unit || !jumlah || !metode) {
    res.status(400).json({ success: false, message: 'Field wajib: tanggal, tipe, kategori, unit, jumlah, metode' });
    return;
  }
  if (!['pemasukan', 'pengeluaran'].includes(tipe)) {
    res.status(400).json({ success: false, message: 'tipe harus pemasukan atau pengeluaran' });
    return;
  }
  const jumlahNum = parseInt(jumlah);
  if (isNaN(jumlahNum) || jumlahNum <= 0) {
    res.status(400).json({ success: false, message: 'jumlah harus angka positif' });
    return;
  }

  const transaksi = await TransaksiKeuangan.create({
    tanggal,
    tipe,
    kategori,
    sub_kategori: sub_kategori || null,
    unit,
    jumlah: jumlahNum,
    keterangan: keterangan || null,
    metode,
    nama_pihak: nama_pihak || null,
    created_by: req.user!.id,
  });

  res.status(201).json({ success: true, data: transaksi });
};

export const updateTransaksi = async (req: AuthRequest, res: Response): Promise<void> => {
  const transaksi = await TransaksiKeuangan.findByPk(req.params.id as string);
  if (!transaksi) { res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' }); return; }

  const { tanggal, tipe, kategori, sub_kategori, unit, jumlah, keterangan, metode, nama_pihak } = req.body;
  await transaksi.update({
    tanggal: tanggal ?? transaksi.tanggal,
    tipe: tipe ?? transaksi.tipe,
    kategori: kategori ?? transaksi.kategori,
    sub_kategori: sub_kategori !== undefined ? sub_kategori : transaksi.sub_kategori,
    unit: unit ?? transaksi.unit,
    jumlah: jumlah ? parseInt(jumlah) : transaksi.jumlah,
    keterangan: keterangan !== undefined ? keterangan : transaksi.keterangan,
    metode: metode ?? transaksi.metode,
    nama_pihak: nama_pihak !== undefined ? nama_pihak : transaksi.nama_pihak,
  });

  res.json({ success: true, data: transaksi });
};

export const deleteTransaksi = async (req: AuthRequest, res: Response): Promise<void> => {
  const transaksi = await TransaksiKeuangan.findByPk(req.params.id as string);
  if (!transaksi) { res.status(404).json({ success: false, message: 'Transaksi tidak ditemukan' }); return; }
  await transaksi.destroy();
  res.json({ success: true, message: 'Transaksi dihapus' });
};

export const getRekap = async (req: AuthRequest, res: Response): Promise<void> => {
  const { bulan, tahun, unit } = req.query;
  const y = parseInt((tahun as string) || new Date().getFullYear().toString());
  const now = new Date();

  // Rekap bulan ini
  const startBulan = bulan
    ? new Date(y, parseInt(bulan as string) - 1, 1).toISOString().split('T')[0]
    : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endBulan = bulan
    ? new Date(y, parseInt(bulan as string), 0).toISOString().split('T')[0]
    : new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const unitVal = Array.isArray(unit) ? unit[0] : unit;
  const unitFilter = unitVal ? `AND unit = :unitVal` : '';

  const [summary] = await sequelize.query<any>(
    `SELECT
       COALESCE(SUM(jumlah) FILTER (WHERE tipe = 'pemasukan'), 0)  AS total_pemasukan,
       COALESCE(SUM(jumlah) FILTER (WHERE tipe = 'pengeluaran'), 0) AS total_pengeluaran,
       COUNT(*) FILTER (WHERE tipe = 'pemasukan')  AS count_pemasukan,
       COUNT(*) FILTER (WHERE tipe = 'pengeluaran') AS count_pengeluaran
     FROM transaksi_keuangan
     WHERE tanggal BETWEEN :start AND :end ${unitFilter}`,
    { replacements: { start: startBulan, end: endBulan, unitVal: unitVal || null }, type: QueryTypes.SELECT },
  );

  // Per kategori
  const perKategori = await sequelize.query<any>(
    `SELECT tipe, kategori, unit, SUM(jumlah) AS total, COUNT(*) AS jumlah_transaksi
     FROM transaksi_keuangan
     WHERE tanggal BETWEEN :start AND :end ${unitFilter}
     GROUP BY tipe, kategori, unit
     ORDER BY tipe, total DESC`,
    { replacements: { start: startBulan, end: endBulan, unitVal: unitVal || null }, type: QueryTypes.SELECT },
  );

  // Trend per bulan (tahun berjalan)
  const trendBulan = await sequelize.query<any>(
    `SELECT
       EXTRACT(MONTH FROM tanggal::date) AS bulan,
       tipe,
       SUM(jumlah) AS total
     FROM transaksi_keuangan
     WHERE tanggal BETWEEN :startTahun AND :endTahun ${unitFilter}
     GROUP BY bulan, tipe
     ORDER BY bulan`,
    {
      replacements: { startTahun: `${y}-01-01`, endTahun: `${y}-12-31`, unitVal: unitVal || null },
      type: QueryTypes.SELECT,
    },
  );

  res.json({
    success: true,
    data: {
      periode: { start: startBulan, end: endBulan },
      summary: {
        total_pemasukan:  parseInt(summary?.total_pemasukan)  || 0,
        total_pengeluaran: parseInt(summary?.total_pengeluaran) || 0,
        saldo: (parseInt(summary?.total_pemasukan) || 0) - (parseInt(summary?.total_pengeluaran) || 0),
        count_pemasukan:   parseInt(summary?.count_pemasukan)  || 0,
        count_pengeluaran: parseInt(summary?.count_pengeluaran) || 0,
      },
      per_kategori: perKategori,
      trend_bulan:  trendBulan,
    },
  });
};

export const getKategoriList = (_req: AuthRequest, res: Response): void => {
  res.json({
    success: true,
    data: {
      pemasukan:      KATEGORI_PEMASUKAN,
      pengeluaran:    KATEGORI_PENGELUARAN,
      sub_ekskul:     SUB_KATEGORI_EKSKUL,
    },
  });
};
