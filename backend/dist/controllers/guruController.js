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
const levelWhere = (school_level) => {
    if (!school_level)
        return {};
    return {
        [sequelize_1.Op.or]: [
            (0, sequelize_1.literal)(`'${school_level}' = ANY(school_levels)`),
            (0, sequelize_1.literal)(`school_levels IS NULL`),
            (0, sequelize_1.literal)(`school_levels = '{}'`),
        ],
    };
};
const getAll = async (req, res) => {
    const { search, jenjang, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userWhere = {};
    if (search)
        userWhere.nama = { [sequelize_1.Op.iLike]: `%${search}%` };
    // Build guru where clause
    const guruWhere = {};
    // If admin has school_level, filter gurus assigned to that level
    if (req.user?.school_level) {
        Object.assign(guruWhere, levelWhere(req.user.school_level));
    }
    // Additional jenjang filter from query param (for master admin)
    if (jenjang) {
        Object.assign(guruWhere, { [sequelize_1.Op.or]: [(0, sequelize_1.literal)(`'${jenjang}' = ANY(school_levels)`)] });
    }
    const hasWhere = Object.keys(guruWhere).length > 0 || Object.getOwnPropertySymbols(guruWhere).length > 0;
    const { count, rows } = await models_1.Guru.findAndCountAll({
        where: hasWhere ? guruWhere : undefined,
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
    const { password, nama, nip, spesialisasi, no_telp, school_levels } = req.body;
    // Generate unique email from nama (used as identifier, not real email)
    let autoEmail = nama;
    let suffix = 2;
    while (await models_1.User.findOne({ where: { email: autoEmail } })) {
        autoEmail = `${nama} ${suffix++}`;
    }
    const autoPassword = password || '12345678';
    const password_hash = await bcrypt_1.default.hash(autoPassword, 10);
    const user = await models_1.User.create({ email: autoEmail, password_hash, nama, role: 'guru' });
    const guru = await models_1.Guru.create({
        user_id: user.id,
        nip: nip || null,
        spesialisasi: spesialisasi || null,
        no_telp: no_telp || null,
        school_levels: Array.isArray(school_levels) ? school_levels : [],
    });
    // Kirim ke n8n async
    const webhookUrl = process.env.N8N_WEBHOOK_GURU;
    if (webhookUrl) {
        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nama,
                email: req.body.email || null,
                login: req.body.email || nama,
                password_default: autoPassword,
                nip: nip || '',
                spesialisasi: spesialisasi || '',
                jenjang: Array.isArray(school_levels) ? school_levels.join(', ') : '',
                tanggal_dibuat: new Date().toISOString(),
            }),
        }).catch(() => { });
    }
    res.status(201).json({ success: true, message: 'Guru berhasil dibuat', data: { user, guru } });
};
exports.create = create;
const update = async (req, res) => {
    const guru = await models_1.Guru.findByPk(req.params.id, { include: [{ model: models_1.User, as: 'user' }] });
    if (!guru)
        throw (0, errorHandler_1.createError)('Guru tidak ditemukan', 404);
    const { nama, nip, spesialisasi, no_telp, is_active, school_levels } = req.body;
    // email field = nama (identifier), update when nama changes
    await guru.user.update({ nama, email: nama, is_active });
    await guru.update({
        nip: nip || null,
        spesialisasi: spesialisasi || null,
        no_telp: no_telp || null,
        school_levels: Array.isArray(school_levels) ? school_levels : guru.school_levels,
    });
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
