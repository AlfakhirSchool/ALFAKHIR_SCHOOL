import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';

export function rateLimiter(maxRequests: number, windowMs: number, keyFn?: (req: Request) => string) {
  const windowSec = Math.ceil(windowMs / 1000);
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `rl:${keyFn ? keyFn(req) : (req.ip || 'unknown')}`;
    try {
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSec);
      if (count > maxRequests) {
        res.status(429).json({ success: false, message: 'Terlalu banyak percobaan. Coba lagi nanti.' });
        return;
      }
    } catch {
      // Redis down → fail open (jangan block user)
    }
    next();
  };
}
