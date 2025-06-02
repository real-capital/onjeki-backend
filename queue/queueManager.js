// services/queue/queueManager.js
import IORedis from 'ioredis';
import redisConnection from '../jobs/redis-connection.js';
import { logger } from '../utils/logger.js';
import bookingQueue from './bookingQueue.js';
import bookingWorker from '../workers/bookingWorker.js';

const IS_VERCEL = process.env.VERCEL === '1';
const workers = [bookingWorker];
// Import other queues
// For API-only mode (Vercel), where we only need to connect to queues, not run workers
export const connectToAllQueues = async () => {
  if (IS_VERCEL) {
    logger.info('Skipping queue connection on Vercel');
    return true;
  }
  try {
    // Only initialize connections to the queues without starting workers
    await bookingQueue.bookingQueue.waitUntilReady();

    logger.info('Connected to all Redis queues successfully');
    return true;
  } catch (error) {
    logger.error('Failed to connect to Redis queues:', error);
    throw error;
  }
};

// For worker mode (Railway), where we start both queues and workers
export const startAllQueuesAndWorkers = async () => {
  if (IS_VERCEL) {
    logger.info('Skipping worker startup on Vercel');
    return true;
  }

  try {
    await bookingQueue.startBookingQueue();

    logger.info('All queues and workers started successfully');
    return true;
  } catch (error) {
    logger.error('Failed to start queues and workers:', error);
    throw error;
  }
};

// For graceful shutdown
export const stopAllQueuesAndWorkers = async () => {
  if (IS_VERCEL) {
    return true;
  }
  try {
    await bookingQueue.stopBookingQueue();

    logger.info('All queues and workers stopped successfully');
    return true;
  } catch (error) {
    logger.error('Failed to stop queues and workers:', error);
    throw error;
  }
};

export default {
  connectToAllQueues,
  startAllQueuesAndWorkers,
  stopAllQueuesAndWorkers,
};
