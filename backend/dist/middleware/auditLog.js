"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = void 0;
const models_1 = require("../models");
const auditLog = (action, tableName) => {
    return async (req, _res, next) => {
        try {
            await models_1.ActivityLog.create({
                user_id: req.user?.id || null,
                action,
                table_name: tableName || null,
                record_id: req.params.id || null,
                new_value: req.body || null,
                ip_address: req.ip || null,
                user_agent: req.headers['user-agent'] || null,
            });
        }
        catch {
            // audit log failure tidak boleh hentikan request
        }
        next();
    };
};
exports.auditLog = auditLog;
