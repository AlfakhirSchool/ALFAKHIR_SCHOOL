"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const database_1 = __importDefault(require("../config/database"));
class ActivityLog extends sequelize_1.Model {
}
ActivityLog.init({
    id: { type: sequelize_1.DataTypes.UUID, defaultValue: sequelize_1.DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: sequelize_1.DataTypes.UUID, allowNull: true },
    nama: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
    role: { type: sequelize_1.DataTypes.STRING(20), allowNull: true },
    school_level: { type: sequelize_1.DataTypes.STRING(3), allowNull: true },
    app_source: { type: sequelize_1.DataTypes.STRING(30), allowNull: true },
    action: { type: sequelize_1.DataTypes.STRING(150), allowNull: false },
    table_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
    record_id: { type: sequelize_1.DataTypes.UUID, allowNull: true },
    old_value: { type: sequelize_1.DataTypes.JSONB, allowNull: true },
    new_value: { type: sequelize_1.DataTypes.JSONB, allowNull: true },
    ip_address: { type: sequelize_1.DataTypes.STRING(45), allowNull: true },
    user_agent: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
}, {
    sequelize: database_1.default,
    tableName: 'activity_log',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at',
});
exports.default = ActivityLog;
