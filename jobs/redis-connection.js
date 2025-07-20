
// import IORedis from 'ioredis';
// import dotenv from 'dotenv';
// import { logger } from '../utils/logger.js';
// import { isWorker, isVercel } from '../utils/environment.js';

// dotenv.config();

// let redisConnection;

// // Only create Redis connection if needed
// if (isWorker() || (!isVercel() && process.env.ENABLE_REDIS !== 'false')) {
//   redisConnection = new IORedis({
//     password: process.env.REDIS_PASSWORD,
//     host: process.env.REDIS_HOST,
//     port: process.env.REDIS_PORT,
//     maxRetriesPerRequest: null,
//     enableOfflineQueue: isWorker(), // true for Railway worker, false for others
//     ...(isVercel() && {
//       lazyConnect: true,
//       connectTimeout: 5000,
//       commandTimeout: 5000,
//     }),
//     ...(isWorker() && {
//       retryStrategy: (times) => {
//         const delay = Math.min(times * 50, 2000);
//         logger.info(`Retrying Redis connection... attempt ${times}`);
//         return delay;
//       },
//     }),
//   });

//   redisConnection.on('connect', () => {
//     logger.info(`Redis connected (${isWorker() ? 'Worker' : 'API'} mode)`);
//   });

//   redisConnection.on('error', (error) => {
//     if (isVercel()) {
//       logger.warn('Redis error on Vercel (non-critical):', error.message);
//     } else {
//       logger.error('Redis connection error:', error.message);
//     }
//   });
// } else {
//   logger.info('Redis connection skipped (Vercel API mode)');
// }

// export { redisConnection };
// export default redisConnection;



// import IORedis from 'ioredis';
// import dotenv from 'dotenv';
// import { logger } from '../utils/logger.js';
// import { isWorker, isVercel } from '../utils/environment.js';
// // Add this right after the imports in your redis-connection.js
// console.log('=== REDIS CONNECTION DEBUG ===');
// console.log('NODE_ENV:', process.env.NODE_ENV);
// console.log('VERCEL:', process.env.VERCEL);
// console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
// console.log('process.argv[1]:', process.argv[1]);
// console.log('isWorker():', isWorker());
// console.log('isVercel():', isVercel());
// console.log('Should create Redis:', isWorker() || (!isVercel() && process.env.ENABLE_REDIS !== 'false'));
// console.log('ENABLE_REDIS:', process.env.ENABLE_REDIS);
// console.log('=== END DEBUG ===');

// dotenv.config();

// let redisConnection;

// // Debug logging
// const shouldCreateRedis = isWorker() || (!isVercel() && process.env.ENABLE_REDIS !== 'false');
// logger.info('Redis connection decision:', {
//   isWorker: isWorker(),
//   isVercel: isVercel(),
//   ENABLE_REDIS: process.env.ENABLE_REDIS,
//   shouldCreate: shouldCreateRedis,
//   NODE_ENV: process.env.NODE_ENV,
//   VERCEL: process.env.VERCEL
// });

// // Only create Redis connection if needed
// if (shouldCreateRedis) {
//   // Add validation to make sure we have Redis config
//   if (!process.env.REDIS_HOST) {
//     logger.error('Redis connection attempted but REDIS_HOST not found');
//     throw new Error('Redis configuration missing');
//   }

//   logger.info('Creating Redis connection...');
  
//   redisConnection = new IORedis({
//     password: process.env.REDIS_PASSWORD,
//     host: process.env.REDIS_HOST,
//     port: process.env.REDIS_PORT,
//     maxRetriesPerRequest: null,
//     enableOfflineQueue: isWorker(),
//     lazyConnect: true, // Always use lazy connect for safety
//     connectTimeout: 5000,
//     commandTimeout: 5000,
//     retryStrategy: (times) => {
//       if (times > 3) {
//         logger.error('Redis connection failed after 3 retries, giving up');
//         return null;
//       }
//       const delay = Math.min(times * 50, 2000);
//       logger.info(`Retrying Redis connection... attempt ${times}`);
//       return delay;
//     },
//   });

//   redisConnection.on('connect', () => {
//     logger.info(`Redis connected (${isWorker() ? 'Worker' : 'API'} mode)`);
//   });

//   redisConnection.on('error', (error) => {
//     logger.error('Redis connection error:', {
//       message: error.message,
//       code: error.code,
//       hostname: error.hostname
//     });
//   });
// } else {
//   logger.info('Redis connection skipped (Vercel mode or disabled)');
// }

// export { redisConnection };
// export default redisConnection;

// jobs/redis-connection.js
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import { isWorker, isVercel } from '../utils/environment.js';

dotenv.config();

let redisConnection;

const shouldCreateRedis = isWorker() || (!isVercel() && process.env.ENABLE_REDIS !== 'false');

logger.info('Redis connection decision:', {
  isWorker: isWorker(),
  isVercel: isVercel(),
  ENABLE_REDIS: process.env.ENABLE_REDIS,
  shouldCreate: shouldCreateRedis,
  NODE_ENV: process.env.NODE_ENV,
  hasRedisUrl: !!process.env.REDIS_URL,
  hasRedisHost: !!process.env.REDIS_HOST
});

if (shouldCreateRedis) {
  try {
    // Use REDIS_URL if available, otherwise use individual components
    const redisConfig = process.env.REDIS_URL ? 
      process.env.REDIS_URL : 
      {
        password: process.env.REDIS_PASSWORD,
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT),
      };

    logger.info('Creating Redis connection...', {
      usingUrl: !!process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    });

    redisConnection = new IORedis(redisConfig, {
      maxRetriesPerRequest: null,
      enableOfflineQueue: isWorker(),
      lazyConnect: true,
      connectTimeout: 10000, // Increased timeout
      commandTimeout: 5000,
      retryStrategy: (times) => {
        if (times > 5) {
          logger.error('Redis connection failed after 5 retries, giving up');
          return null;
        }
        const delay = Math.min(times * 1000, 5000);
        logger.info(`Retrying Redis connection... attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
    });

    redisConnection.on('connect', () => {
      logger.info(`Redis connected successfully (${process.env.NODE_ENV} mode)`);
    });

    redisConnection.on('ready', () => {
      logger.info('Redis connection is ready to receive commands');
    });

    redisConnection.on('error', (error) => {
      logger.error('Redis connection error:', {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        address: error.address
      });
    });

    redisConnection.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisConnection.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

  } catch (error) {
    logger.error('Failed to create Redis connection:', error);
    redisConnection = null;
  }
} else {
  logger.info('Redis connection skipped');
}

export { redisConnection };
export default redisConnection;