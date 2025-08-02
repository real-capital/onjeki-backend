import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';
import { isWorker, isVercel } from '../utils/environment.js';

dotenv.config();

let redisConnection;

const shouldCreateRedis =
  isWorker() || (!isVercel() && process.env.ENABLE_REDIS !== 'false');

// Detect environment
const isRender = process.env.RENDER === 'true' || process.env.RENDER_SERVICE_ID;
const isLocal = !isRender && !isVercel();

logger.info('Redis connection decision', {
  isWorker: isWorker(),
  isVercel: isVercel(),
  isRender: isRender,
  isLocal: isLocal,
  ENABLE_REDIS: process.env.ENABLE_REDIS,
  shouldCreate: shouldCreateRedis,
  NODE_ENV: process.env.NODE_ENV,
  hasRedisUrl: !!process.env.REDIS_URL,
  hasRedisHost: !!process.env.REDIS_HOST,
  redisHost: process.env.REDIS_HOST,
});

if (shouldCreateRedis) {
  try {
    const usingUrl = !!process.env.REDIS_URL;

    // General Redis configuration (NOT for BullMQ)
    const baseConfig = {
      maxRetriesPerRequest: 3, // For general Redis operations
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: isRender ? 30000 : 20000,
      commandTimeout: isRender ? 45000 : 30000,
      retryDelayOnFailover: 2000,
      enableReadyCheck: true,
      maxLoadingTimeout: 15000,
      family: 4, // Force IPv4
      keepAlive: true,
      enableAutoPipelining: false,
      reconnectOnError: (err) => {
        const reconnectErrors = ['READONLY', 'ECONNRESET', 'EPIPE', 'ENOTFOUND'];
        return reconnectErrors.some(targetError => 
          err.message && err.message.includes(targetError)
        );
      },
      retryStrategy: (times) => {
        const maxRetries = 10;
        if (times > maxRetries) {
          logger.error(`Redis connection failed after ${maxRetries} retries, giving up`);
          return null;
        }
        const baseDelay = Math.min(times * 1000, 5000);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        logger.info(`Retrying Redis connection... attempt ${times}, delay: ${Math.round(delay)}ms`);
        return delay;
      },
    };

    logger.info('Creating Redis Cloud connection...', {
      environment: isRender ? 'render' : isLocal ? 'local' : 'other',
      usingUrl,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      hasPassword: !!process.env.REDIS_PASSWORD,
    });

    // Create general Redis connection
    if (usingUrl) {
      redisConnection = new IORedis(process.env.REDIS_URL, {
        ...baseConfig,
        enableTLSForSentinelMode: false,
        sentinelRetryStrategy: null,
      });
    } else {
      redisConnection = new IORedis({
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
        username: 'default',
        ...baseConfig,
      });
    }

    // Connection event handlers
    redisConnection.on('connect', () => {
      logger.info(`🔄 Connecting to Redis Cloud... (${isRender ? 'Render' : 'Local'} environment)`);
    });

    redisConnection.on('ready', async () => {
      logger.info('✅ Redis Cloud connection ready!');

      try {
        const pingResult = await redisConnection.ping();
        logger.info('✅ Redis Cloud ping successful:', pingResult);
      } catch (e) {
        logger.error('❌ Redis Cloud ping failed:', e.message);
      }
    });

    redisConnection.on('error', (error) => {
      if (error.message?.includes('Command timed out')) {
        logger.error('⚠️ Redis Cloud command timeout.');
      } else if (error.message?.includes('ECONNREFUSED')) {
        logger.error('⚠️ Redis Cloud connection refused.');
      } else if (error.message?.includes('NOAUTH')) {
        logger.error('⚠️ Redis Cloud authentication failed.');
      } else {
        logger.error('❌ Redis Cloud error:', {
          message: error.message,
          code: error.code,
        });
      }
    });

    redisConnection.on('close', () => {
      logger.warn('⚠️ Redis Cloud connection closed');
    });

    redisConnection.on('reconnecting', (delay) => {
      logger.info(`🔄 Reconnecting to Redis Cloud in ${delay}ms...`);
    });

    // Connect asynchronously
    const connectWithTimeout = async () => {
      try {
        const connectPromise = redisConnection.connect();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initial connection timeout')), 45000)
        );

        await Promise.race([connectPromise, timeoutPromise]);
        logger.info('✅ Redis Cloud initial connection successful');
      } catch (error) {
        logger.error('❌ Failed to establish initial Redis Cloud connection:', error.message);
      }
    };

    connectWithTimeout();

  } catch (error) {
    logger.error('❌ Failed to create Redis Cloud connection:', error);
    redisConnection = null;
  }
} else {
  logger.info('Redis connection skipped due to environment configuration');
}

// Create a separate Redis connection specifically for BullMQ
export const createBullMQRedisConnection = () => {
  const bullmqConfig = {
    maxRetriesPerRequest: null, // REQUIRED by BullMQ
    enableOfflineQueue: false,
    lazyConnect: false, // BullMQ prefers immediate connection
    connectTimeout: isRender ? 30000 : 20000,
    commandTimeout: isRender ? 60000 : 30000,
    retryDelayOnFailover: 2000,
    enableReadyCheck: true,
    maxLoadingTimeout: 15000,
    family: 4,
    keepAlive: true,
    enableAutoPipelining: false,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error(`BullMQ Redis connection failed after 10 retries, giving up`);
        return null;
      }
      const delay = Math.min(times * 2000, 10000);
      logger.info(`Retrying BullMQ Redis connection... attempt ${times}, delay: ${delay}ms`);
      return delay;
    },
  };

  logger.info('Creating BullMQ Redis connection...', {
    maxRetriesPerRequest: bullmqConfig.maxRetriesPerRequest,
    hasRedisUrl: !!process.env.REDIS_URL,
  });

  if (process.env.REDIS_URL) {
    return new IORedis(process.env.REDIS_URL, bullmqConfig);
  } else {
    return new IORedis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      username: 'default',
      ...bullmqConfig,
    });
  }
};

// Helper functions
export const isRedisAvailable = () => {
  return redisConnection && redisConnection.status === 'ready';
};

export const safeRedisCommand = async (command, ...args) => {
  if (!isRedisAvailable()) {
    logger.warn('Redis Cloud not available, skipping command:', command);
    return null;
  }

  try {
    if (['blpop', 'brpop', 'brpoplpush', 'bzpopmin', 'bzpopmax'].includes(command.toLowerCase())) {
      logger.warn(`Blocking command ${command} should use BullMQ's Redis connection`);
      return null;
    }

    const commandPromise = redisConnection[command](...args);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Redis command ${command} timeout`)), 15000)
    );

    return await Promise.race([commandPromise, timeoutPromise]);
  } catch (error) {
    logger.error(`Redis Cloud command ${command} failed:`, error.message);
    return null;
  }
};

export const closeRedisConnection = async () => {
  if (redisConnection) {
    try {
      logger.info('Closing Redis Cloud connection...');
      await redisConnection.quit();
      logger.info('✅ Redis Cloud connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis Cloud connection:', error.message);
      redisConnection.disconnect();
    }
  }
};

export { redisConnection };
export default redisConnection;