"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class PembayaranDetail extends sequelize_1.Model {
}
PembayaranDetail.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    pembayaran_id: { type: sequelize_1.DataTypes.UUID, allowNull: false, references: { model: 'pembayaran', key: 'id' } },
    nominal_bayar: { type: sequelize_1.DataTypes.DECIMAL(15, 2), allowNull: false },
    tanggal_bayar: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    bank: { type: sequelize_1.DataTypes.STRING(50), allowNull: true },
    reference_number: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
}, {
    sequelize: database_1.default,
    tableName: 'pembayaran_detail',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at',
});
exports.default = PembayaranDetail;
