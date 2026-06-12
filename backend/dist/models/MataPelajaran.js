"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class MataPelajaran extends sequelize_1.Model {
}
MataPelajaran.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    nama: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    kode: { type: sequelize_1.DataTypes.STRING(20), allowNull: false, unique: true },
    kkm: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 75 },
}, { sequelize: database_1.default, tableName: 'mata_pelajaran', timestamps: false });
exports.default = MataPelajaran;
