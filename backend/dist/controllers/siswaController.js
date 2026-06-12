"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.create = exports.getById = exports.getAll = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const sequelize_1 = require("sequelize");
const models_1 = require("../models");
const errorHandler_1 = require("../middleware/errorHandler");
const getAll = async (req, res) => {
    const { kelas_id, tahun_ajaran, search, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (kelas_id)
        where.kelas_id = kelas_id;
    const kelasWhere = {};
    if (tahun_ajaran)
        kelasWhere.tahun_ajaran = tahun_ajaran;
    const userWhere = {};
    if (search) {
        userWhere.nama = { [sequelize_1.Op.iLike]: `%${search}%` };
    }
    const { count, rows } = await models_1.Siswa.findAndCountAll({
        where,
        include: [
            { model: models_1.User, as: 'user', where: userWhere, attributes: { exclude: ['password_hash'] } },
            { model: models_1.Kelas, as: 'kelas', where: kelasWhere, include: [{ model: models_1.Sekolah, as: 'sekolah' }] },
        ],
        limit: parseInt(limit),
        offset,
        order: [['nisn', 'ASC']],
    });
    res.json({
        success: true,
        data: rows,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) },
    });
};
exports.getAll = getAll;
const getById = async (req, res) => {
    const siswa = await models_1.Siswa.findByPk(req.params.id, {
        include: [
            { model: models_1.User, as: 'user', attributes: { exclude: ['password_hash'] } },
            { model: models_1.Kelas, as: 'kelas', include: [{ model: models_1.Sekolah, as: 'sekolah' }] },
        ],
    });
    if (!siswa)
        throw (0, errorHandler_1.createError)('Siswa tidak ditemukan', 404);
    res.json({ success: true, data: siswa });
};
exports.getById = getById;
const create = async (req, res) => {
    const { email, password, nama, nisn, nis, no_induk, kelas_id, tempat_lahir, tanggal_lahir, alamat } = req.body;
    const existing = await models_1.User.findOne({ where: { email } });
    if (existing) {
        res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
        return;
    }
    const existingNisn = await models_1.Siswa.findOne({ where: { nisn } });
    if (existingNisn) {
        res.status(400).json({ success: false, message: 'NISN sudah terdaftar' });
        return;
    }
    const password_hash = await bcrypt_1.default.hash(password || nisn, 12);
    const user = await models_1.User.create({ email, password_hash, nama, role: 'siswa' });
    const siswa = await models_1.Siswa.create({ user_id: user.id, kelas_id, nisn, nis, no_induk, tempat_lahir, tanggal_lahir, alamat });
    res.status(201).json({ success: true, message: 'Siswa berhasil dibuat', data: { user, siswa } });
};
exports.create = create;
const update = async (req, res) => {
    const siswa = await models_1.Siswa.findByPk(req.params.id, { include: [{ model: models_1.User, as: 'user' }] });
    if (!siswa)
        throw (0, errorHandler_1.createError)('Siswa tidak ditemukan', 404);
    const { nama, email, kelas_id, nisn, nis, no_induk, tempat_lahir, tanggal_lahir, alamat, is_active } = req.body;
    await siswa.user.update({ nama, email, is_active });
    await siswa.update({ kelas_id, nisn, nis, no_induk, tempat_lahir, tanggal_lahir, alamat });
    res.json({ success: true, message: 'Data siswa berhasil diperbarui' });
};
exports.update = update;
const remove = async (req, res) => {
    const siswa = await models_1.Siswa.findByPk(req.params.id, { include: [{ model: models_1.User, as: 'user' }] });
    if (!siswa)
        throw (0, errorHandler_1.createError)('Siswa tidak ditemukan', 404);
    await siswa.user.update({ is_active: false });
    res.json({ success: true, message: 'Siswa berhasil dinonaktifkan' });
};
exports.remove = remove;
