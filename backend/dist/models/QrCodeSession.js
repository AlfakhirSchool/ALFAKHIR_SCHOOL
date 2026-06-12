"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class QrCodeSession extends sequelize_1.Model {
}
QrCodeSession.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    jadwal_pelajaran_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'jadwal_pelajaran', key: 'id' } },
    tanggal: { type: sequelize_1.DataTypes.DATEONLY, allowNull: false },
    unique_code: { type: sequelize_1.DataTypes.STRING(6), allowNull: false },
    qr_data: { type: sequelize_1.DataTypes.TEXT, allowNull: false },
    aktif: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: true },
    waktu_mulai: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    waktu_selesai: { type: sequelize_1.DataTypes.DATE, allowNull: true },
}, { sequelize: database_1.default, tableName: 'qr_code_session', timestamps: false });
exports.default = QrCodeSession;
