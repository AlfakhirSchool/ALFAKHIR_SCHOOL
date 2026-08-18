import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { UserRole, SchoolLevel } from '../models/User';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string | null;
    nama: string;
    role: UserRole;
    school_level: SchoolLevel;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret) as { id: string; email: string | null; nama: string; role: UserRole; school_level: SchoolLevel };

    const user = await User.findOne({ where: { id: decoded.id, is_active: true } });
    if (!user) {
      res.status(401).json({ success: false, message: 'Akun tidak ditemukan atau tidak aktif' });
      return;
    }

    // Role diambil dari DB, bukan token — mencegah token-tampering untuk eskalasi privilege
    req.user = { id: user.id, email: user.email, nama: user.nama, role: user.role, school_level: user.school_level };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Akses ditolak. Role tidak memiliki izin.' });
      return;
    }
    next();
  };
};
