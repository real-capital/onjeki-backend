// // jobs/redis-connection.js
// import IORedis from 'ioredis';
// import dotenv from 'dotenv';
// import { logger } from '../utils/logger.js';

// // Ensure dotenv is loaded
// dotenv.config();

// // Get Redis config from environment
// const redisHost = process.env.REDIS_HOST;
// const redisPort = parseInt(process.env.REDIS_PORT || '6379');
// const redisPassword = process.env.REDIS_PASSWORD;
// const redisEnabled = process.env.ENABLE_REDIS === 'true';

// // Log Redis configuration (remove for production)
// logger.info('Redis configuration:', {
//   host: redisHost || 'not set',
//   port: redisPort,
//   passwordSet: !!redisPassword,
//   enabled: redisEnabled,
// });

// // MockRedisClient implementation
// class MockRedisClient {
//   constructor() {
//     logger.info('Using mock Redis client');
//   }
//   /* mock methods */
//   async waitUntilReady() {
//     return true;
//   }
//   async add() {
//     return { id: 'mock-id-' + Date.now() };
//   }
//   async removeJobs() {
//     return true;
//   }
//   async close() {
//     return true;
//   }
//   on() {
//     return this;
//   }
// }

// // Determine which Redis client to use
// let redisConnection;

// if (
//   !redisEnabled ||
//   !redisHost ||
//   redisHost === '127.0.0.1' ||
//   redisHost === 'localhost'
// ) {
//   logger.info('Redis disabled or missing configuration, using mock client');
//   redisConnection = new MockRedisClient();
// } else {
//   try {
//     // Create connection with explicit config
//     redisConnection = new IORedis({
//       host: redisHost,
//       port: redisPort,
//       password: redisPassword,
//       maxRetriesPerRequest: null,
//       connectTimeout: 10000,
//       retryStrategy(times) {
//         if (times > 3) return null;
//         return Math.min(times * 100, 3000);
//       },
//     });

//     redisConnection.on('connect', () => {
//       logger.info('Successfully connected to Redis');
//     });

//     redisConnection.on('error', (error) => {
//       logger.error('Redis connection error:', error);
//       if (error.code === 'ECONNREFUSED') {
//         logger.warn('Falling back to mock Redis client');
//         redisConnection = new MockRedisClient();
//       }
//     });
//   } catch (error) {
//     logger.error('Failed to initialize Redis connection:', error);
//     redisConnection = new MockRedisClient();
//   }
// }

// export { redisConnection };
// export default redisConnection;

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
  enableOfflineQueue: true,
  offlineQueue: true,
});

redisConnection.on('connect', () => {
  logger.info('Connected to Redis cluster');
});

redisConnection.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

export default redisConnection;
