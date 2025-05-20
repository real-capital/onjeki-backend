// // jobs/redis-connection.js
// import IORedis from 'ioredis';
// import dotenv from 'dotenv';
// import { logger } from '../utils/logger.js';

// dotenv.config();

// // export const redisConnection = new IORedis({
// //   password: process.env.REDIS_PASSWORD,
// //   host: process.env.REDIS_HOST,
// //   port: process.env.REDIS_PORT,
// //   maxRetriesPerRequest: null,
// //   enableOfflineQueue: false,
// //   offlineQueue: false,
// // });

// export const redisConnection = new IORedis({
//   password: process.env.REDIS_PASSWORD,
//   host: process.env.REDIS_HOST,
//   port: process.env.REDIS_PORT,
//   maxRetriesPerRequest: null,
//   enableOfflineQueue: false,
//   offlineQueue: false,
//   connectTimeout: 15000, // Increase timeout even more
//   retryStrategy(times) {
//     // Add retry strategy
//     const delay = Math.min(times * 100, 3000);
//     logger.info(`Redis connection retry attempt ${times} after ${delay}ms`);
//     return delay;
//   },
// });

// redisConnection.on('connect', () => {
//   logger.info('Connected to Redis cluster');
// });

// redisConnection.on('error', (error) => {
//   logger.error('Redis connection error:', error);
// });

// export default redisConnection;

// jobs/redis-connection.js
import IORedis from 'ioredis';
import { logger } from '../utils/logger.js';

// Determine if we're in a serverless environment
const IS_SERVERLESS =
  process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
const REDIS_ENABLED = process.env.ENABLE_REDIS === 'true';

// Create a mock Redis client for environments where Redis isn't needed
class MockRedisClient {
  constructor() {
    logger.info(
      'Using mock Redis client - queue operations will be logged but not executed'
    );
  }

  async waitUntilReady() {
    return true;
  }
  async add() {
    logger.info('Mock Redis: add job called', arguments[0]);
    return { id: 'mock-id-' + Date.now() };
  }
  async removeJobs() {
    return true;
  }
  async close() {
    return true;
  }
  on() {
    return this;
  }
}

// Export real or mock connection based on environment
export let redisConnection;

if (IS_SERVERLESS && !REDIS_ENABLED) {
  logger.info('Serverless environment detected, using mock Redis client');
  redisConnection = new MockRedisClient();
} else {
  try {
    logger.info('Initializing real Redis connection');
    redisConnection = new IORedis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      connectTimeout: 20000,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return times >= 3 ? null : delay; // Only retry 3 times
      },
    });

    redisConnection.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });
  } catch (error) {
    logger.error('Failed to initialize Redis connection:', error);
    // Fall back to mock client on error
    redisConnection = new MockRedisClient();
  }
}

export default redisConnection;
