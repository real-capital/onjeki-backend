// import IORedis from 'ioredis';
// import dotenv from 'dotenv';
// import { logger } from '../utils/logger.js';
// import { isWorker, isVercel } from '../utils/environment.js';

// dotenv.config();

// let redisConnection;

// const shouldCreateRedis =
//   isWorker() || (!isVercel() && process.env.ENABLE_REDIS !== 'false');

// // Detect environment
// const isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_ID;
// const isLocal = !isRender && !isVercel();

// logger.info('Redis connection decision', {
//   isWorker: isWorker(),
//   isVercel: isVercel(),
//   isRender: isRender,
//   isLocal: isLocal,
//   ENABLE_REDIS: process.env.ENABLE_REDIS,
//   shouldCreate: shouldCreateRedis,
//   NODE_ENV: process.env.NODE_ENV,
//   hasRedisUrl: !!process.env.REDIS_URL,
//   hasRedisHost: !!process.env.REDIS_HOST,
//   redisHost: process.env.REDIS_HOST,
// });

// if (shouldCreateRedis) {
//   try {
//     const usingUrl = !!process.env.REDIS_URL;

//     // BullMQ-compatible configuration
//     const baseConfig = {
//       maxRetriesPerRequest: null, // REQUIRED for BullMQ
//       enableOfflineQueue: false,
//       lazyConnect: true,
//       connectTimeout: isRender ? 30000 : 20000,
//       commandTimeout: isRender ? 45000 : 30000,
//       retryDelayOnFailover: 2000,
//       enableReadyCheck: true,
//       maxLoadingTimeout: 15000,
//       family: 4, // Force IPv4
//       keepAlive: true,
//       enableAutoPipelining: false, // Better for cloud Redis
//       reconnectOnError: (err) => {
//         // Reconnect on specific Redis Cloud errors
//         const reconnectErrors = ['READONLY', 'ECONNRESET', 'EPIPE', 'ENOTFOUND'];
//         return reconnectErrors.some(targetError => 
//           err.message && err.message.includes(targetError)
//         );
//       },
//       retryStrategy: (times) => {
//         const maxRetries = 10; // More retries for cloud Redis
//         if (times > maxRetries) {
//           logger.error(`Redis connection failed after ${maxRetries} retries, giving up`);
//           return null;
//         }
//         // Progressive backoff with jitter for cloud connections
//         const baseDelay = Math.min(times * 1000, 5000);
//         const jitter = Math.random() * 1000;
//         const delay = baseDelay + jitter;
        
//         logger.info(`Retrying Redis connection... attempt ${times}, delay: ${Math.round(delay)}ms`);
//         return delay;
//       },
//     };

//     logger.info('Creating Redis Cloud connection for BullMQ...', {
//       environment: isRender ? 'render' : isLocal ? 'local' : 'other',
//       usingUrl,
//       host: process.env.REDIS_HOST,
//       port: process.env.REDIS_PORT,
//       hasPassword: !!process.env.REDIS_PASSWORD,
//       maxRetriesPerRequest: baseConfig.maxRetriesPerRequest, // Should show null
//       config: {
//         connectTimeout: baseConfig.connectTimeout,
//         commandTimeout: baseConfig.commandTimeout,
//       }
//     });

//     // Create connection using URL (preferred for Redis Cloud)
//     if (usingUrl) {
//       redisConnection = new IORedis(process.env.REDIS_URL, {
//         ...baseConfig,
//         // Additional Redis Cloud URL parsing options
//         enableTLSForSentinelMode: false,
//         sentinelRetryStrategy: null,
//       });
//     } else {
//       // Fallback to individual parameters
//       redisConnection = new IORedis({
//         host: process.env.REDIS_HOST,
//         port: Number(process.env.REDIS_PORT),
//         password: process.env.REDIS_PASSWORD,
//         username: 'default', // Redis Cloud uses 'default' username
//         ...baseConfig,
//       });
//     }

//     // Connection event handlers
//     redisConnection.on('connect', () => {
//       logger.info(`🔄 Connecting to Redis Cloud... (${isRender ? 'Render' : 'Local'} environment)`);
//     });

//     redisConnection.on('ready', async () => {
//       logger.info('✅ Redis Cloud connection ready for BullMQ!');

//       // Test basic operations
//       try {
//         const pingResult = await redisConnection.ping();
//         logger.info('✅ Redis Cloud ping successful:', pingResult);

//         // Test a simple set/get operation
//         const testKey = `test:${Date.now()}`;
//         await redisConnection.setex(testKey, 10, 'test-value');
//         const testValue = await redisConnection.get(testKey);
        
//         if (testValue === 'test-value') {
//           logger.info('✅ Redis Cloud read/write test successful');
//           await redisConnection.del(testKey); // Clean up
//         } else {
//           logger.warn('⚠️ Redis Cloud read/write test failed');
//         }
//       } catch (e) {
//         logger.error('❌ Redis Cloud operation test failed:', e.message);
//       }

//       // Check Redis Cloud configuration (with timeout)
//       try {
//         const configPromise = redisConnection.config('GET', 'maxmemory-policy');
//         const timeoutPromise = new Promise((_, reject) => 
//           setTimeout(() => reject(new Error('Config check timeout')), 8000)
//         );

//         const result = await Promise.race([configPromise, timeoutPromise]);
//         const policy = result?.[1];

//         if (!policy) {
//           logger.warn('Could not determine eviction policy (Redis Cloud may restrict CONFIG commands)');
//         } else {
//           logger.info(`Redis Cloud eviction policy: ${policy}`);
//           if (policy !== 'noeviction') {
//             logger.warn(`IMPORTANT! Eviction policy is ${policy}. Consider upgrading Redis Cloud plan for noeviction policy.`);
//           }
//         }
//       } catch (e) {
//         // Redis Cloud often restricts CONFIG commands
//         logger.info('Redis Cloud CONFIG access restricted (this is normal for managed Redis)');
//       }

//       // Get Redis info
//       try {
//         const info = await redisConnection.info('server');
//         const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
//         const mode = info.match(/redis_mode:([^\r\n]+)/)?.[1];
        
//         logger.info(`✅ Redis Cloud info - Version: ${version}, Mode: ${mode}`);
//       } catch (e) {
//         logger.warn('Could not get Redis Cloud info:', e.message);
//       }
//     });

//     redisConnection.on('error', (error) => {
//       // Handle Redis Cloud specific errors
//       if (error.message?.includes('Command timed out')) {
//         logger.error('⚠️ Redis Cloud command timeout. This may indicate network latency or plan limits.');
//       } else if (error.message?.includes('ECONNREFUSED')) {
//         logger.error('⚠️ Redis Cloud connection refused. Check your credentials and network.');
//       } else if (error.message?.includes('ENOTFOUND')) {
//         logger.error('⚠️ Redis Cloud host not found. Check REDIS_HOST configuration.');
//       } else if (error.message?.includes('NOAUTH')) {
//         logger.error('⚠️ Redis Cloud authentication failed. Check REDIS_PASSWORD.');
//       } else if (error.message?.includes('WRONGPASS')) {
//         logger.error('⚠️ Redis Cloud wrong password. Check REDIS_PASSWORD.');
//       } else {
//         logger.error('❌ Redis Cloud error:', {
//           message: error.message,
//           code: error.code,
//           errno: error.errno,
//         });
//       }
//     });

//     redisConnection.on('close', () => {
//       logger.warn('⚠️ Redis Cloud connection closed');
//     });

//     redisConnection.on('reconnecting', (delay) => {
//       logger.info(`🔄 Reconnecting to Redis Cloud in ${delay}ms...`);
//     });

//     redisConnection.on('end', () => {
//       logger.warn('⚠️ Redis Cloud connection ended');
//     });

//     // Graceful connection with extended timeout for cloud
//     const connectWithTimeout = async () => {
//       try {
//         const connectPromise = redisConnection.connect();
//         const timeoutPromise = new Promise((_, reject) => 
//           setTimeout(() => reject(new Error('Initial connection timeout')), 45000)
//         );

//         await Promise.race([connectPromise, timeoutPromise]);
//         logger.info('✅ Redis Cloud initial connection successful');
//       } catch (error) {
//         logger.error('❌ Failed to establish initial Redis Cloud connection:', error.message);
        
//         // For cloud Redis, don't immediately null the connection
//         // Let the retry strategy handle reconnection attempts
//         if (isLocal && !process.env.REDIS_URL.includes('redis-cloud.com') && !process.env.REDIS_URL.includes('redns.redis-cloud.com')) {
//           redisConnection = null;
//         }
//       }
//     };

//     // Connect asynchronously
//     connectWithTimeout();

//   } catch (error) {
//     logger.error('❌ Failed to create Redis Cloud connection:', error);
//     redisConnection = null;
//   }
// } else {
//   logger.info('Redis connection skipped due to environment configuration');
// }

// // Helper function to check if Redis is available
// export const isRedisAvailable = () => {
//   return redisConnection && redisConnection.status === 'ready';
// };

// // Helper function to safely execute Redis commands with cloud-appropriate timeouts
// // NOTE: For BullMQ operations, use BullMQ's own Redis connections
// export const safeRedisCommand = async (command, ...args) => {
//   if (!isRedisAvailable()) {
//     logger.warn('Redis Cloud not available, skipping command:', command);
//     return null;
//   }

//   try {
//     // For non-blocking commands, we can add timeout
//     // For blocking commands, BullMQ handles its own connections
//     if (['blpop', 'brpop', 'brpoplpush', 'bzpopmin', 'bzpopmax'].includes(command.toLowerCase())) {
//       logger.warn(`Blocking command ${command} should use BullMQ's Redis connection, not the shared connection`);
//       return null;
//     }

//     const commandPromise = redisConnection[command](...args);
//     const timeoutPromise = new Promise((_, reject) => 
//       setTimeout(() => reject(new Error(`Redis command ${command} timeout`)), 15000)
//     );

//     return await Promise.race([commandPromise, timeoutPromise]);
//   } catch (error) {
//     logger.error(`Redis Cloud command ${command} failed:`, error.message);
//     return null;
//   }
// };

// // Create a separate Redis connection specifically for BullMQ
// // This ensures BullMQ gets exactly what it needs
// export const createBullMQRedisConnection = () => {
//   const bullmqConfig = {
//     maxRetriesPerRequest: null, // Required by BullMQ
//     enableOfflineQueue: false,
//     lazyConnect: false, // BullMQ prefers immediate connection
//     connectTimeout: isRender ? 30000 : 20000,
//     commandTimeout: isRender ? 60000 : 30000, // Longer for blocking operations
//     retryDelayOnFailover: 2000,
//     enableReadyCheck: true,
//     maxLoadingTimeout: 15000,
//     family: 4,
//     keepAlive: true,
//     enableAutoPipelining: false,
//     retryStrategy: (times) => {
//       if (times > 10) {
//         logger.error(`BullMQ Redis connection failed after 10 retries, giving up`);
//         return null;
//       }
//       const delay = Math.min(times * 2000, 10000);
//       logger.info(`Retrying BullMQ Redis connection... attempt ${times}, delay: ${delay}ms`);
//       return delay;
//     },
//   };

//   if (process.env.REDIS_URL) {
//     return new IORedis(process.env.REDIS_URL, bullmqConfig);
//   } else {
//     return new IORedis({
//       host: process.env.REDIS_HOST,
//       port: Number(process.env.REDIS_PORT),
//       password: process.env.REDIS_PASSWORD,
//       username: 'default',
//       ...bullmqConfig,
//     });
//   }
// };

// // Graceful shutdown
// export const closeRedisConnection = async () => {
//   if (redisConnection) {
//     try {
//       logger.info('Closing Redis Cloud connection...');
//       await redisConnection.quit();
//       logger.info('✅ Redis Cloud connection closed gracefully');
//     } catch (error) {
//       logger.error('Error closing Redis Cloud connection:', error.message);
//       redisConnection.disconnect();
//     }
//   }
// };

// export { redisConnection };
// export default redisConnection;

// jobs/redis-connection.js
import { redisConnection } from '../config/redis.js';

// This file exists for backward compatibility
export { redisConnection };
export default redisConnection;