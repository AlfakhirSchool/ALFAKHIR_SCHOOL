import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const logout: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const refreshToken: (req: Request, res: Response) => Promise<void>;
export declare const getProfile: (req: AuthRequest, res: Response) => Promise<void>;
export declare const changePassword: (req: AuthRequest, res: Response) => Promise<void>;
