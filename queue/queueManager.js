// services/queue/queueManager.js
import { logger } from '../../utils/logger.js';
import bookingQueue from './bookingQueue.js';

// Import other queues
// For API-only mode (Vercel), where we only need to connect to queues, not run workers
export const connectToAllQueues = async () => {
  try {
    // Only initialize connections to the queues without starting workers
    await bookingQueue.bookingQueue.waitUntilReady();
    
    // Connect to other queues as needed
    // await transactionQueue.waitUntilReady();
    // await bvnVerificationQueue.waitUntilReady();
    // await spaceRentQueue.waitUntilReady();
    // await spaceRentFirstDepositQueue.waitUntilReady();
    // await emailQueue.waitUntilReady();
    
    logger.info('Connected to all Redis queues successfully');
    return true;
  } catch (error) {
    logger.error('Failed to connect to Redis queues:', error);
    throw error;
  }
};

// For worker mode (Railway), where we start both queues and workers
export const startAllQueuesAndWorkers = async () => {
  try {
    await bookingQueue.startBookingQueue();
    
    // Start other queues and workers
    // await startTransactionQueue();
    // await startBVNVerificationQueue();
    // await startSpaceRentQueue();
    // await startSpaceRentFirstDepositQueue();
    // await startEmailQueue();
    
    logger.info('All queues and workers started successfully');
    return true;
  } catch (error) {
    logger.error('Failed to start queues and workers:', error);
    throw error;
  }
};

// For graceful shutdown
export const stopAllQueuesAndWorkers = async () => {
  try {
    await bookingQueue.stopBookingQueue();
    
    // Stop other queues and workers
    // await stopTransactionQueue();
    // await stopBVNVerificationQueue();
    // await stopSpaceRentQueue();
    // await stopSpaceRentFirstDepositQueue();
    // await stopEmailQueue();
    
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
  stopAllQueuesAndWorkers
};