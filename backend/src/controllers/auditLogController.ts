import { Request, Response } from 'express';
import { Op } from 'sequelize';
import ActivityLog from '../models/ActivityLog';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1, limit = 50,
      table_name, action, role, app_source,
      start_date, end_date, search,
    } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (table_name) where.table_name = table_name;
    if (role) where.role = role;
    if (app_source) where.app_source = app_source;
    if (action) where.action = { [Op.iLike]: `%${action}%` };
    if (search) {
      where[Op.or] = [
        { nama: { [Op.iLike]: `%${search}%` } },
        { action: { [Op.iLike]: `%${search}%` } },
        { table_name: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) where.created_at[Op.gte] = new Date(start_date as string);
      if (end_date) {
        const end = new Date(end_date as string);
        end.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = end;
      }
    }

    const { count, rows } = await ActivityLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset,
      attributes: ['id', 'user_id', 'nama', 'role', 'school_level', 'app_source', 'action', 'table_name', 'record_id', 'new_value', 'ip_address', 'created_at'],
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / Number(limit)),
      },
    });
  } catch {
    res.status(500).json({ success: false, message: 'Gagal memuat audit log' });
  }
};

export const getLiveFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const rows = await ActivityLog.findAll({
      order: [['created_at', 'DESC']],
      limit,
      attributes: ['id', 'nama', 'role', 'school_level', 'app_source', 'action', 'table_name', 'created_at'],
    });
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, message: 'Gagal memuat live feed' });
  }
};

export const getAuditLogStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const seq = ActivityLog.sequelize!;

    const [total, todayCount, byRole, byApp] = await Promise.all([
      ActivityLog.count(),
      ActivityLog.count({ where: { created_at: { [Op.gte]: today } } }),
      ActivityLog.findAll({
        where: { created_at: { [Op.gte]: today } },
        attributes: ['role', [seq.fn('COUNT', seq.col('id')), 'count']],
        group: ['role'],
        raw: true,
      }),
      ActivityLog.findAll({
        where: { created_at: { [Op.gte]: today } },
        attributes: ['app_source', [seq.fn('COUNT', seq.col('id')), 'count']],
        group: ['app_source'],
        raw: true,
      }),
    ]);

    res.json({ success: true, data: { total, today: todayCount, byRole, byApp } });
  } catch {
    res.status(500).json({ success: false, message: 'Gagal memuat statistik' });
  }
};
