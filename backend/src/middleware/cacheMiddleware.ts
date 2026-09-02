import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';

// Cache GET responses in Redis. Key = route + query string.
export function cache(ttlSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') { next(); return; }
    const key = `cache:${req.originalUrl}`;
    try {
      const cached = await redis.get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.json(JSON.parse(cached));
        return;
      }
    } catch { /* redis down — fall through */ }

    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode === 200) {
        redis.setex(key, ttlSeconds, JSON.stringify(body)).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}

export function invalidateCache(pattern: string) {
  return redis.keys(pattern).then(keys => keys.length ? redis.del(...keys) : 0).catch(() => 0);
}
