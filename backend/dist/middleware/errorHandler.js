"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.notFound = exports.errorHandler = void 0;
const logger_1 = __importDefault(require("../config/logger"));
const errorHandler = (err, req, res, _next) => {
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Terjadi kesalahan pada server';
    if (statusCode >= 500) {
        logger_1.default.error({ message: err.message, stack: err.stack, url: req.url, method: req.method });
    }
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
const notFound = (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} tidak ditemukan` });
};
exports.notFound = notFound;
const createError = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
};
exports.createError = createError;
