import { Request, Response } from 'express';
import { Op } from 'sequelize';
import ActivityLog from '../models/ActivityLog';
import User from '../models/User';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, table_name, action, start_date, end_date } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (table_name) where.table_name = table_name;
    if (action) where.action = action;
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
      include: [{ model: User, as: 'user', attributes: ['id', 'email', 'role'] }],
      order: [['created_at', 'DESC']],
      limit: Number(limit),
      offset,
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat audit log' });
  }
};

export const getAuditLogStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount] = await Promise.all([
      ActivityLog.count(),
      ActivityLog.count({ where: { created_at: { [Op.gte]: today } } }),
    ]);

    res.json({ success: true, data: { total, today: todayCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat statistik' });
  }
};
