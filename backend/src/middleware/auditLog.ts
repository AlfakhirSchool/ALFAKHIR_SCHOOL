import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { ActivityLog } from '../models';

export const auditLog = (action: string, tableName?: string) => {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await ActivityLog.create({
        user_id: req.user?.id || null,
        action,
        table_name: tableName || null,
        record_id: (req.params.id as string) || null,
        new_value: req.body || null,
        ip_address: req.ip || null,
        user_agent: req.headers['user-agent'] || null,
      });
    } catch {
      // audit log failure tidak boleh hentikan request
    }
    next();
  };
};
