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
    const { search, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userWhere = {};
    if (search)
        userWhere.nama = { [sequelize_1.Op.iLike]: `%${search}%` };
    const { count, rows } = await models_1.Guru.findAndCountAll({
        include: [{ model: models_1.User, as: 'user', where: userWhere, attributes: { exclude: ['password_hash'] } }],
        limit: parseInt(limit),
        offset,
    });
    res.json({
        success: true,
        data: rows,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / parseInt(limit)) },
    });
};
exports.getAll = getAll;
const getById = async (req, res) => {
    const guru = await models_1.Guru.findByPk(req.params.id, {
        include: [{ model: models_1.User, as: 'user', attributes: { exclude: ['password_hash'] } }],
    });
    if (!guru)
        throw (0, errorHandler_1.createError)('Guru tidak ditemukan', 404);
    res.json({ success: true, data: guru });
};
exports.getById = getById;
const create = async (req, res) => {
    const { email, password, nama, nip, spesialisasi, no_telp } = req.body;
    const existing = await models_1.User.findOne({ where: { email } });
    if (existing) {
        res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
        return;
    }
    const password_hash = await bcrypt_1.default.hash(password || '12345678', 12);
    const user = await models_1.User.create({ email, password_hash, nama, role: 'guru' });
    const guru = await models_1.Guru.create({ user_id: user.id, nip, spesialisasi, no_telp });
    res.status(201).json({ success: true, message: 'Guru berhasil dibuat', data: { user, guru } });
};
exports.create = create;
const update = async (req, res) => {
    const guru = await models_1.Guru.findByPk(req.params.id, { include: [{ model: models_1.User, as: 'user' }] });
    if (!guru)
        throw (0, errorHandler_1.createError)('Guru tidak ditemukan', 404);
    const { nama, email, nip, spesialisasi, no_telp, is_active } = req.body;
    await guru.user.update({ nama, email, is_active });
    await guru.update({ nip, spesialisasi, no_telp });
    res.json({ success: true, message: 'Data guru berhasil diperbarui' });
};
exports.update = update;
const remove = async (req, res) => {
    const guru = await models_1.Guru.findByPk(req.params.id, { include: [{ model: models_1.User, as: 'user' }] });
    if (!guru)
        throw (0, errorHandler_1.createError)('Guru tidak ditemukan', 404);
    await guru.user.update({ is_active: false });
    res.json({ success: true, message: 'Guru berhasil dinonaktifkan' });
};
exports.remove = remove;
