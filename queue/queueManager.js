

// // queue/queueManager.js
// import { logger } from '../utils/logger.js';
// import { isWorker, isVercel } from '../utils/environment.js';



// export const connectToAllQueues = async () => {
//   if (isVercel()) {
//     logger.info('Skipping queue connection on Vercel');
//     return true;
//   }

//   try {
//     // Dynamic import only when needed
//     const { default: bookingQueue } = await import('./bookingQueue.js');

//     if (bookingQueue.bookingQueue) {
//       await bookingQueue.bookingQueue.waitUntilReady();
//       logger.info('Connected to all Redis queues successfully');
//         //  await bookingQueue.clearQueue();
//     }
//     return true;
//   } catch (error) {
//     logger.error('Failed to connect to Redis queues:', error);
//     // Don't throw on Vercel
//     if (!isVercel()) {
//       throw error;
//     }
//     return false;
//   }
// };

// export const startAllQueuesAndWorkers = async () => {
//   if (!isWorker()) {
//     logger.info('Not in worker mode, skipping worker startup');
//     return true;
//   }

//   try {
//     // Dynamic imports for worker mode only
//     const { default: bookingQueue } = await import('./bookingQueue.js');
//     const { default: bookingWorker } = await import(
//       '../workers/bookingWorker.js'
//     );
 

//     await bookingQueue.startBookingQueue();
//     logger.info('All queues and workers started successfully');
//     return true;
//   } catch (error) {
//     logger.error('Failed to start queues and workers:', error);
//     throw error;
//   }
// };

// export const stopAllQueuesAndWorkers = async () => {
//   if (!isWorker()) {
//     return true;
//   }

//   try {
//     const { default: bookingQueue } = await import('./bookingQueue.js');
//     await bookingQueue.stopBookingQueue();
//     logger.info('All queues and workers stopped successfully');
//     return true;
//   } catch (error) {
//     logger.error('Failed to stop queues and workers:', error);
//     throw error;
//   }
// };

// export default {
//   connectToAllQueues,
//   startAllQueuesAndWorkers,
//   stopAllQueuesAndWorkers,
// };



// queue/queueManager.js
import { logger } from '../utils/logger.js';
import { isWorker, isVercel } from '../utils/environment.js';

export const connectToAllQueues = async () => {
  if (isVercel()) {
    logger.info('Skipping queue connection on Vercel');
    return true;
  }

  if (!isWorker()) {
    logger.info('Not in worker mode, skipping queue connection');
    return true;
  }

  try {
    // Only import when we're actually going to use it
    const { default: bookingQueue } = await import('./bookingQueue.js');

    if (bookingQueue.bookingQueue) {
      await bookingQueue.bookingQueue.waitUntilReady();
      logger.info('Connected to all Redis queues successfully');
    }
    return true;
  } catch (error) {
    logger.error('Failed to connect to Redis queues:', error);
    throw error;
  }
};

export const startAllQueuesAndWorkers = async () => {
  if (!isWorker()) {
    logger.info('Not in worker mode, skipping worker startup');
    return true;
  }

  try {
    // Only import in worker mode
    const { default: bookingQueue } = await import('./bookingQueue.js');
    const { default: bookingWorker } = await import('../workers/bookingWorker.js');

    await bookingQueue.startBookingQueue();
    logger.info('All queues and workers started successfully');
    return true;
  } catch (error) {
    logger.error('Failed to start queues and workers:', error);
    throw error;
  }
};

export const stopAllQueuesAndWorkers = async () => {
  if (!isWorker()) {
    return true;
  }

  try {
    const { default: bookingQueue } = await import('./bookingQueue.js');
    await bookingQueue.stopBookingQueue();
    logger.info('All queues and workers stopped successfully');
    return true;
  } catch (error) {
    logger.error('Failed to stop queues and workers:', error);
    throw error;
  }
};