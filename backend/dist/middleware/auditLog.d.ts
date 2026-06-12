import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export declare const auditLog: (action: string, tableName?: string) => (req: AuthRequest, _res: Response, next: NextFunction) => Promise<void>;
