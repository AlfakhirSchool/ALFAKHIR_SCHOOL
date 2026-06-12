import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const create: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getSiswa: (req: AuthRequest, res: Response) => Promise<void>;
export declare const update: (req: AuthRequest, res: Response) => Promise<void>;
export declare const remove: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getLaporan: (req: AuthRequest, res: Response) => Promise<void>;
