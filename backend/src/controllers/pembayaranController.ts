import { Response } from 'express';
import { Op } from 'sequelize';
import { Pembayaran, PembayaranDetail, Siswa, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import logger from '../config/logger';

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id, status, tahun_ajaran, page = '1', limit = '20' } = req.query;
  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

  const where: Record<string, unknown> = {};
  if (siswa_id) where.siswa_id = siswa_id;
  if (status) where.status = status;
  if (tahun_ajaran) where.tahun_ajaran = tahun_ajaran;

  if (req.user!.role === 'ortu') {
    // filter hanya anak milik ortu ini - akan di-handle nanti via middleware
  }

  const { count, rows } = await Pembayaran.findAndCountAll({
    where,
    include: [
      { model: Siswa, as: 'siswa', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
      { model: PembayaranDetail, as: 'detail_list' },
    ],
    limit: parseInt(limit as string),
    offset,
    order: [['tanggal_jatuh_tempo', 'ASC']],
  });

  res.json({
    success: true,
    data: rows,
    pagination: { total: count, page: parseInt(page as string), limit: parseInt(limit as string), totalPages: Math.ceil(count / parseInt(limit as string)) },
  });
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  const { siswa_id, tahun_ajaran, jenis_biaya, nominal_biaya, tanggal_jatuh_tempo, va_bank } = req.body;

  const siswa = await Siswa.findByPk(siswa_id);
  if (!siswa) throw createError('Siswa tidak ditemukan', 404);

  // Generate Virtual Account (placeholder - di-replace oleh N8N workflow)
  const virtual_account = va_bank === 'bca'
    ? `${process.env.BCA_VA_PREFIX}${siswa.nisn}`
    : `${process.env.MANDIRI_VA_PREFIX}${siswa.nisn}`;

  const pembayaran = await Pembayaran.create({
    siswa_id,
    tahun_ajaran,
    jenis_biaya,
    nominal_biaya,
    virtual_account,
    va_bank: va_bank || null,
    tanggal_jatuh_tempo: tanggal_jatuh_tempo ? new Date(tanggal_jatuh_tempo) : null,
  });

  res.status(201).json({
    success: true,
    message: 'Tagihan berhasil dibuat',
    data: pembayaran,
  });
};

export const bayar = async (req: AuthRequest, res: Response): Promise<void> => {
  const { nominal_bayar, bank, reference_number } = req.body;

  const pembayaran = await Pembayaran.findByPk(req.params.id as string, { include: [{ model: PembayaranDetail, as: 'detail_list' }] });
  if (!pembayaran) throw createError('Tagihan tidak ditemukan', 404);

  const totalTerbayar = (pembayaran.nominal_terbayar || 0) + nominal_bayar;
  let newStatus: 'belum_bayar' | 'sebagian' | 'lunas' = 'sebagian';
  if (totalTerbayar >= pembayaran.nominal_biaya) newStatus = 'lunas';
  if (totalTerbayar === 0) newStatus = 'belum_bayar';

  await PembayaranDetail.create({
    pembayaran_id: pembayaran.id,
    nominal_bayar,
    tanggal_bayar: new Date(),
    bank,
    reference_number,
  });

  await pembayaran.update({
    nominal_terbayar: totalTerbayar,
    status: newStatus,
    tanggal_bayar: newStatus === 'lunas' ? new Date() : pembayaran.tanggal_bayar,
    metode_bayar: bank,
  });

  res.json({ success: true, message: 'Pembayaran berhasil dicatat', data: { status: newStatus, total_terbayar: totalTerbayar } });
};

export const getLaporan = async (req: AuthRequest, res: Response): Promise<void> => {
  const { tahun_ajaran, status } = req.query;
  const where: Record<string, unknown> = {};
  if (tahun_ajaran) where.tahun_ajaran = tahun_ajaran;
  if (status) where.status = status;

  const pembayaranList = await Pembayaran.findAll({
    where,
    include: [
      { model: Siswa, as: 'siswa', include: [{ model: User, as: 'user', attributes: ['nama'] }] },
    ],
    order: [['tanggal_jatuh_tempo', 'ASC']],
  });

  const totalTagihan = pembayaranList.reduce((sum, p) => sum + Number(p.nominal_biaya), 0);
  const totalTerbayar = pembayaranList.reduce((sum, p) => sum + Number(p.nominal_terbayar), 0);
  const totalTunggakan = totalTagihan - totalTerbayar;

  res.json({
    success: true,
    data: pembayaranList,
    summary: { total_tagihan: totalTagihan, total_terbayar: totalTerbayar, total_tunggakan: totalTunggakan },
  });
};

export const webhookBca = async (req: AuthRequest, res: Response): Promise<void> => {
  // Handler untuk webhook notifikasi pembayaran dari BCA
  const payload = req.body;
  logger.info({ event: 'bca_webhook', payload });

  try {
    const { virtual_account, amount, reference } = payload;
    const pembayaran = await Pembayaran.findOne({ where: { virtual_account } });

    if (pembayaran) {
      const totalBayar = Number(pembayaran.nominal_terbayar) + Number(amount);
      const status = totalBayar >= Number(pembayaran.nominal_biaya) ? 'lunas' : 'sebagian';

      await PembayaranDetail.create({
        pembayaran_id: pembayaran.id,
        nominal_bayar: amount,
        tanggal_bayar: new Date(),
        bank: 'bca',
        reference_number: reference,
      });

      await pembayaran.update({ nominal_terbayar: totalBayar, status });
    }

    res.json({ status: 'ok' });
  } catch (error) {
    logger.error({ event: 'bca_webhook_error', error });
    res.status(500).json({ status: 'error' });
  }
};

export const webhookMandiri = async (req: AuthRequest, res: Response): Promise<void> => {
  const payload = req.body;
  logger.info({ event: 'mandiri_webhook', payload });
  res.json({ status: 'ok' });
};
