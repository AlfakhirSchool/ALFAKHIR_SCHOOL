"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookMandiri = exports.webhookBca = exports.getLaporan = exports.bayar = exports.create = exports.getAll = void 0;
const models_1 = require("../models");
const errorHandler_1 = require("../middleware/errorHandler");
const logger_1 = __importDefault(require("../config/logger"));
const getAll = async (req, res) => {
    const { siswa_id, status, tahun_ajaran, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (siswa_id)
        where.siswa_id = siswa_id;
    if (status)
        where.status = status;
    if (tahun_ajaran)
        where.tahun_ajaran = tahun_ajaran;
    if (req.user.role === 'ortu') {
        // filter hanya anak milik ortu ini - akan di-handle nanti via middleware
    }
    const { count, rows } = await models_1.Pembayaran.findAndCountAll({
        where,
        include: [
            { model: models_1.Siswa, as: 'siswa', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
            { model: models_1.PembayaranDetail, as: 'detail_list' },
        ],
        limit: parseInt(limit),
        offset,
        order: [['tanggal_jatuh_tempo', 'ASC']],
    });
    res.json({
        success: true,
        data: rows,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) },
    });
};
exports.getAll = getAll;
const create = async (req, res) => {
    const { siswa_id, tahun_ajaran, jenis_biaya, nominal_biaya, tanggal_jatuh_tempo, va_bank } = req.body;
    const siswa = await models_1.Siswa.findByPk(siswa_id);
    if (!siswa)
        throw (0, errorHandler_1.createError)('Siswa tidak ditemukan', 404);
    // Generate Virtual Account (placeholder - di-replace oleh N8N workflow)
    const virtual_account = va_bank === 'bca'
        ? `${process.env.BCA_VA_PREFIX}${siswa.nisn}`
        : `${process.env.MANDIRI_VA_PREFIX}${siswa.nisn}`;
    const pembayaran = await models_1.Pembayaran.create({
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
exports.create = create;
const bayar = async (req, res) => {
    const { nominal_bayar, bank, reference_number } = req.body;
    const pembayaran = await models_1.Pembayaran.findByPk(req.params.id, { include: [{ model: models_1.PembayaranDetail, as: 'detail_list' }] });
    if (!pembayaran)
        throw (0, errorHandler_1.createError)('Tagihan tidak ditemukan', 404);
    const totalTerbayar = (pembayaran.nominal_terbayar || 0) + nominal_bayar;
    let newStatus = 'sebagian';
    if (totalTerbayar >= pembayaran.nominal_biaya)
        newStatus = 'lunas';
    if (totalTerbayar === 0)
        newStatus = 'belum_bayar';
    await models_1.PembayaranDetail.create({
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
    if (newStatus === 'lunas' && process.env.N8N_WEBHOOK_URL) {
        const siswaData = await models_1.Pembayaran.findByPk(pembayaran.id, {
            include: [{ model: models_1.Siswa, as: 'siswa', include: [{ model: models_1.User, as: 'user', attributes: ['nama', 'email'] }] }],
        });
        const email = siswaData?.siswa?.user?.email;
        const nama_siswa = siswaData?.siswa?.user?.nama;
        if (email) {
            fetch(`${process.env.N8N_WEBHOOK_URL}/payment-confirmed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    nama_siswa,
                    jenis_pembayaran: pembayaran.jenis_biaya,
                    nominal: totalTerbayar,
                    tahun_ajaran: pembayaran.tahun_ajaran,
                }),
            }).catch((err) => logger_1.default.error({ event: 'n8n_webhook_error', error: err.message }));
        }
    }
    res.json({ success: true, message: 'Pembayaran berhasil dicatat', data: { status: newStatus, total_terbayar: totalTerbayar } });
};
exports.bayar = bayar;
const getLaporan = async (req, res) => {
    const { tahun_ajaran, status } = req.query;
    const where = {};
    if (tahun_ajaran)
        where.tahun_ajaran = tahun_ajaran;
    if (status)
        where.status = status;
    const pembayaranList = await models_1.Pembayaran.findAll({
        where,
        include: [
            { model: models_1.Siswa, as: 'siswa', include: [{ model: models_1.User, as: 'user', attributes: ['nama'] }] },
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
exports.getLaporan = getLaporan;
const webhookBca = async (req, res) => {
    // Handler untuk webhook notifikasi pembayaran dari BCA
    const payload = req.body;
    logger_1.default.info({ event: 'bca_webhook', payload });
    try {
        const { virtual_account, amount, reference } = payload;
        const pembayaran = await models_1.Pembayaran.findOne({ where: { virtual_account } });
        if (pembayaran) {
            const totalBayar = Number(pembayaran.nominal_terbayar) + Number(amount);
            const status = totalBayar >= Number(pembayaran.nominal_biaya) ? 'lunas' : 'sebagian';
            await models_1.PembayaranDetail.create({
                pembayaran_id: pembayaran.id,
                nominal_bayar: amount,
                tanggal_bayar: new Date(),
                bank: 'bca',
                reference_number: reference,
            });
            await pembayaran.update({ nominal_terbayar: totalBayar, status });
        }
        res.json({ status: 'ok' });
    }
    catch (error) {
        logger_1.default.error({ event: 'bca_webhook_error', error });
        res.status(500).json({ status: 'error' });
    }
};
exports.webhookBca = webhookBca;
const webhookMandiri = async (req, res) => {
    const payload = req.body;
    logger_1.default.info({ event: 'mandiri_webhook', payload });
    res.json({ status: 'ok' });
};
exports.webhookMandiri = webhookMandiri;
