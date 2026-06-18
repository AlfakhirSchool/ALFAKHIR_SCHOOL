"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.uploadProfilePhoto = exports.getProfile = exports.refreshToken = exports.logout = exports.login = exports.upload = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const models_1 = require("../models");
const errorHandler_1 = require("../middleware/errorHandler");
const uploadsDir = path_1.default.join(__dirname, '..', '..', 'uploads', 'profiles');
if (!fs_1.default.existsSync(uploadsDir))
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadsDir),
        filename: (_req, file, cb) => {
            const ext = path_1.default.extname(file.originalname).toLowerCase() || '.jpg';
            cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/'))
            cb(null, true);
        else
            cb(new Error('Hanya file gambar yang diizinkan'));
    },
});
const generateTokens = (user) => {
    const accessOpts = { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') };
    const refreshOpts = { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') };
    const accessToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, nama: user.nama, role: user.role }, process.env.JWT_SECRET, accessOpts);
    const refreshToken = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, refreshOpts);
    return { accessToken, refreshToken };
};
const login = async (req, res) => {
    const { email, nis, password, role: loginRole } = req.body;
    if (!password || (!email && !nis)) {
        res.status(400).json({ success: false, message: 'NIS/email dan password wajib diisi' });
        return;
    }
    let user = null;
    if (nis) {
        const siswa = await models_1.Siswa.findOne({
            where: { nis },
            include: [{ model: models_1.User, as: 'user' }],
        });
        if (!siswa) {
            res.status(401).json({ success: false, message: 'NIS atau password salah' });
            return;
        }
        const targetRole = loginRole || 'siswa';
        if (targetRole === 'ortu') {
            const ortu = await models_1.OrangTua.findOne({
                where: { siswa_id: siswa.id },
                include: [{ model: models_1.User, as: 'user' }],
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            user = ortu?.user ?? null;
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            user = siswa.user ?? null;
        }
    }
    else {
        user = await models_1.User.findOne({ where: { email, is_active: true } });
    }
    if (!user || !user.is_active) {
        res.status(401).json({ success: false, message: 'NIS/email atau password salah' });
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const validPassword = await bcrypt_1.default.compare(password, user.password_hash);
    if (!validPassword) {
        res.status(401).json({ success: false, message: 'NIS/email atau password salah' });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileData = { ...user.toJSON() };
    if (user.role === 'siswa') {
        const siswa = await models_1.Siswa.findOne({
            where: { user_id: user.id },
            include: [{ model: models_1.Kelas, as: 'kelas', include: [{ model: models_1.Sekolah, as: 'sekolah' }] }],
        });
        if (siswa)
            profileData.siswa = siswa.toJSON();
    }
    else if (user.role === 'guru') {
        const guru = await models_1.Guru.findOne({ where: { user_id: user.id } });
        if (guru)
            profileData.guru = guru.toJSON();
    }
    else if (user.role === 'ortu') {
        const ortuList = await models_1.OrangTua.findAll({
            where: { user_id: user.id },
            include: [{
                    model: models_1.Siswa,
                    as: 'siswa',
                    include: [
                        { model: models_1.Kelas, as: 'kelas', include: [{ model: models_1.Sekolah, as: 'sekolah' }] },
                        { model: models_1.User, as: 'user', attributes: ['nama', 'profile_pic'] },
                    ],
                }],
        });
        profileData.ortu = ortuList.map((o) => o.toJSON());
    }
    res.json({ success: true, data: profileData });
};
exports.getProfile = getProfile;
const uploadProfilePhoto = async (req, res) => {
    const file = req.file;
    if (!file) {
        res.status(400).json({ success: false, message: 'File tidak ditemukan' });
        return;
    }
    const user = await models_1.User.findByPk(req.user.id);
    if (!user)
        throw (0, errorHandler_1.createError)('User tidak ditemukan', 404);
    // Delete old photo if exists
    if (user.profile_pic) {
        const oldPath = path_1.default.join(__dirname, '..', '..', user.profile_pic.replace(/^\//, ''));
        if (fs_1.default.existsSync(oldPath))
            fs_1.default.unlinkSync(oldPath);
    }
    const profilePicUrl = `/uploads/profiles/${file.filename}`;
    await user.update({ profile_pic: profilePicUrl });
    res.json({ success: true, data: { profile_pic: profilePicUrl } });
};
exports.uploadProfilePhoto = uploadProfilePhoto;
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
