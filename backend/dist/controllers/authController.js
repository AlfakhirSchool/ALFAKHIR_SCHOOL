"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.getProfile = exports.refreshToken = exports.logout = exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const errorHandler_1 = require("../middleware/errorHandler");
const generateTokens = (user) => {
    const accessOpts = { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') };
    const refreshOpts = { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') };
    const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, nama: user.nama, role: user.role }, process.env.JWT_SECRET, accessOpts);
    const refreshToken = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, refreshOpts);
    return { accessToken, refreshToken };
};
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });
        return;
    }
    const user = await models_1.User.findOne({ where: { email, is_active: true } });
    if (!user) {
        res.status(401).json({ success: false, message: 'Email atau password salah' });
        return;
    }
    const validPassword = await bcrypt_1.default.compare(password, user.password_hash);
    if (!validPassword) {
        res.status(401).json({ success: false, message: 'Email atau password salah' });
        return;
    }
    const { accessToken, refreshToken } = generateTokens(user);
    let profileDetail = null;
    if (user.role === 'guru') {
        profileDetail = await models_1.Guru.findOne({ where: { user_id: user.id } });
    }
    else if (user.role === 'siswa') {
        profileDetail = await models_1.Siswa.findOne({ where: { user_id: user.id } });
    }
    else if (user.role === 'ortu') {
        profileDetail = await models_1.OrangTua.findOne({ where: { user_id: user.id } });
    }
    res.json({
        success: true,
        data: {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                nama: user.nama,
                role: user.role,
                profile_pic: user.profile_pic,
                profile_detail: profileDetail,
            },
        },
    });
};
exports.login = login;
const logout = async (_req, res) => {
    res.json({ success: true, message: 'Logout berhasil' });
};
exports.logout = logout;
const refreshToken = async (req, res) => {
    const { refreshToken: token } = req.body;
    if (!token) {
        res.status(400).json({ success: false, message: 'Refresh token wajib diisi' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await models_1.User.findOne({ where: { id: decoded.id, is_active: true } });
        if (!user) {
            res.status(401).json({ success: false, message: 'User tidak ditemukan' });
            return;
        }
        const tokens = generateTokens(user);
        res.json({ success: true, data: tokens });
    }
    catch {
        res.status(401).json({ success: false, message: 'Refresh token tidak valid' });
    }
};
exports.refreshToken = refreshToken;
const getProfile = async (req, res) => {
    const user = await models_1.User.findByPk(req.user.id, {
        attributes: { exclude: ['password_hash'] },
    });
    if (!user) {
        throw (0, errorHandler_1.createError)('User tidak ditemukan', 404);
    }
    res.json({ success: true, data: user });
};
exports.getProfile = getProfile;
const changePassword = async (req, res) => {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
        res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi' });
        return;
    }
    const user = await models_1.User.findByPk(req.user.id);
    if (!user) {
        throw (0, errorHandler_1.createError)('User tidak ditemukan', 404);
    }
    const valid = await bcrypt_1.default.compare(old_password, user.password_hash);
    if (!valid) {
        res.status(400).json({ success: false, message: 'Password lama tidak benar' });
        return;
    }
    const hashed = await bcrypt_1.default.hash(new_password, 12);
    await user.update({ password_hash: hashed });
    res.json({ success: true, message: 'Password berhasil diubah' });
};
exports.changePassword = changePassword;
