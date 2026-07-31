import { Request, Response, NextFunction } from 'express';
import { UserRole, SchoolLevel } from '../models/User';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        nama: string;
        role: UserRole;
        school_level: SchoolLevel;
    };
}
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const authorize: (...roles: UserRole[]) => (req: AuthRequest, res: Response, next: NextFunction) => void;
