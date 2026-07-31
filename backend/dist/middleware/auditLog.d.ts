import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
export declare const globalAuditLogger: (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const logAction: (opts: {
    user_id?: string;
    nama?: string;
    role?: string;
    school_level?: string | null;
    app_source?: string;
    action: string;
    table?: string;
    record_id?: string;
    new_value?: object;
    ip?: string;
    user_agent?: string;
}) => Promise<void>;
