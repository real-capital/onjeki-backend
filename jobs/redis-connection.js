// jobs/redis-connection.js
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

export const redisConnection = new IORedis({
  password: process.env.REDIS_PASSWORD,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  offlineQueue: false,
});

redisConnection.on('connect', () => {
  logger.info('Connected to Redis cluster');
});

redisConnection.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

export default redisConnection;
