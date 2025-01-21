// utils/cache.js
import Redis from 'ioredis';

class CacheService {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD
    });
  }

  async get(key) {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, expireTime = 3600) {
    await this.redis.set(
      key,
      JSON.stringify(value),
      'EX',
      expireTime
    );
  }

  async del(key) {
    await this.redis.del(key);
  }

  async clearCache() {
    await this.redis.flushall();
  }
}

export const cacheService = new CacheService();

