"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const models_1 = require("../models");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
            return;
        }
        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET;
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        const user = await models_1.User.findOne({ where: { id: decoded.id, is_active: true } });
        if (!user) {
            res.status(401).json({ success: false, message: 'Akun tidak ditemukan atau tidak aktif' });
            return;
        }
        // Role diambil dari DB, bukan token — mencegah token-tampering untuk eskalasi privilege
        req.user = { id: user.id, email: user.email, nama: user.nama, role: user.role, school_level: user.school_level };
        next();
    }
    catch {
        res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa' });
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Unauthorized' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ success: false, message: 'Akses ditolak. Role tidak memiliki izin.' });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
