import redis from '../config/redis';

/** Non-blocking alternative to redis.keys() — uses SCAN cursor iteration */
export const scanKeys = async (pattern: string): Promise<string[]> => {
  const keys: string[] = [];
  const stream = redis.scanStream({ match: pattern, count: 100 });
  return new Promise((resolve, reject) => {
    stream.on('data', (batch: string[]) => keys.push(...batch));
    stream.on('end', () => resolve(keys));
    stream.on('error', reject);
  });
};
