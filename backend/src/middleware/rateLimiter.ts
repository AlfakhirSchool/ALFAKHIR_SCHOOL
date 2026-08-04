import { Request, Response, NextFunction } from 'express';

const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next(); return;
    }
    entry.count++;
    if (entry.count > maxRequests) {
      res.status(429).json({ success: false, message: 'Terlalu banyak percobaan. Coba lagi nanti.' });
      return;
    }
    next();
  };
}
