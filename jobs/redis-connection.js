// jobs/redis-connection.js
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

// export const redisConnection = new IORedis({
//   password: process.env.REDIS_PASSWORD,
//   host: process.env.REDIS_HOST,
//   port: process.env.REDIS_PORT,
//   maxRetriesPerRequest: null,
//   enableOfflineQueue: false,
//   offlineQueue: false,
// });

export const redisConnection = new IORedis({
  password: process.env.REDIS_PASSWORD,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  offlineQueue: false,
  connectTimeout: 15000, // Increase timeout even more
  retryStrategy(times) {
    // Add retry strategy
    const delay = Math.min(times * 100, 3000);
    logger.info(`Redis connection retry attempt ${times} after ${delay}ms`);
    return delay;
  },
});

redisConnection.on('connect', () => {
  logger.info('Connected to Redis cluster');
});

redisConnection.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

export default redisConnection;
