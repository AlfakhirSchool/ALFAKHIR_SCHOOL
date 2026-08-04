import { Request, Response, NextFunction } from 'express';

const store = new Map<string, { count: number; resetAt: number }>();

// Bersihkan entri expired setiap 60 detik agar map tidak tumbuh tak terbatas
setInterval(() => {
  const now = Date.now();
  store.forEach((v, k) => { if (now > v.resetAt) store.delete(k); });
}, 60 * 1000);

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
