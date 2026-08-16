"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class User extends sequelize_1.Model {
}
User.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    email: { type: sequelize_1.DataTypes.STRING(255), allowNull: false, unique: true },
    username: { type: sequelize_1.DataTypes.STRING(255), allowNull: true, unique: true },
    password_hash: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    nama: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
    role: { type: sequelize_1.DataTypes.ENUM('admin', 'guru', 'pewawancara', 'keuangan', 'siswa', 'ortu'), allowNull: false },
    school_level: { type: sequelize_1.DataTypes.ENUM('SD', 'SMP', 'SMA'), allowNull: true },
    is_active: { type: sequelize_1.DataTypes.BOOLEAN, defaultValue: true },
    profile_pic: { type: sequelize_1.DataTypes.STRING(500), allowNull: true },
    device_id: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
}, {
    sequelize: database_1.default,
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});
exports.default = User;
