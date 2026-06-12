import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const adminDashboard: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const guruDashboard: (req: AuthRequest, res: Response) => Promise<void>;
export declare const parentDashboard: (req: AuthRequest, res: Response) => Promise<void>;
export declare const studentDashboard: (req: AuthRequest, res: Response) => Promise<void>;
