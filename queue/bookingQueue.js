// // queue/bookingQueue.js
// import { Queue, QueueEvents } from 'bullmq';
// import { redisConnection } from '../jobs/redis-connection.js';
// import { logger } from '../utils/logger.js';
// import IORedis from 'ioredis';

// // Determine if we're using a mock Redis client
// const isMockRedis = !(redisConnection instanceof IORedis);

// // Create a mock version of the bookingQueue when using mock Redis
// export const bookingQueue = new Queue('bookingQueue', {
//   connection: redisConnection,
//   defaultJobOptions: {
//     attempts: 3,
//     backoff: {
//       type: 'exponential',
//       delay: 1000,
//     },
//     removeOnComplete: {
//       age: 3600,
//       count: 1000,
//     },
//     removeOnFail: {
//       age: 24 * 3600,
//     },
//   },
// });

// // Create queue events listener - but only if using real Redis
// const bookingQueueEvents = new QueueEvents('bookingQueue', {
//   connection: redisConnection,
// });

// // Schedule reminder for day before booking
// export const scheduleReminderDayBefore = async (bookingId, scheduledTime) => {
//   try {
//     // Validate the input time
//     const startTimeMillis = new Date(scheduledTime).getTime();
//     if (isNaN(startTimeMillis)) {
//       logger.error(
//         `Invalid scheduledTime for booking ${bookingId}: ${scheduledTime}`
//       );
//       throw new Error(`Invalid booking start time: ${scheduledTime}`);
//     }

//     // Calculate delay with validation
//     const reminderTime = new Date(startTimeMillis);
//     reminderTime.setDate(reminderTime.getDate() - 1);

//     const now = new Date();
//     let delay = reminderTime.getTime() - now.getTime();
//     delay = Math.max(0, delay); // Ensure delay is not negative

//     logger.info(
//       `Scheduling day-before reminder for booking ${bookingId} with delay of ${delay}ms`
//     );

//     await bookingQueue.add(
//       'notify-day-before',
//       { bookingId },
//       {
//         delay,
//         jobId: `day-before-${bookingId}`,
//       }
//     );

//     return { status: 'success', message: 'Day before reminder scheduled' };
//   } catch (error) {
//     logger.error(
//       `Error scheduling day-before reminder for booking ${bookingId}:`,
//       error
//     );
//     throw error;
//   }
// };
// export const schedule15MinReminder = async (bookingId, scheduledTime) => {
//   try {
//     // Calculate delay: time until 15 minutes before booking
//     const reminderTime = new Date(scheduledTime);
//     reminderTime.setMinutes(reminderTime.getMinutes() - 15);

//     const now = new Date();
//     let delay = reminderTime.getTime() - now.getTime();
//     delay = Math.max(0, delay); // Ensure delay is not negative

//     logger.info(
//       `Scheduling 15-min reminder for booking ${bookingId} with delay of ${delay}ms`
//     );

//     await bookingQueue.add(
//       'notify-15min-before',
//       { bookingId },
//       {
//         delay,
//         jobId: `15min-before-${bookingId}`,
//       }
//     );

//     return { status: 'success', message: '15-minute reminder scheduled' };
//   } catch (error) {
//     logger.error(
//       `Error scheduling 15-min reminder for booking ${bookingId}:`,
//       error
//     );
//     throw error;
//   }
// };

// // Schedule auto check-in at booking start time
// export const scheduleAutoCheckIn = async (bookingId, scheduledTime) => {
//   try {
//     const now = new Date();
//     let delay = new Date(scheduledTime).getTime() - now.getTime();
//     delay = Math.max(0, delay); // Ensure delay is not negative

//     logger.info(
//       `Scheduling auto check-in for booking ${bookingId} with delay of ${delay}ms`
//     );

//     await bookingQueue.add(
//       'auto-check-in',
//       { bookingId },
//       {
//         delay,
//         jobId: `check-in-${bookingId}`,
//       }
//     );

//     return { status: 'success', message: 'Auto check-in scheduled' };
//   } catch (error) {
//     logger.error(
//       `Error scheduling auto check-in for booking ${bookingId}:`,
//       error
//     );
//     throw error;
//   }
// };

// // Schedule auto check-out at booking end time
// export const scheduleAutoCheckOut = async (bookingId, endTime) => {
//   try {
//     const now = new Date();
//     let delay = new Date(endTime).getTime() - now.getTime();
//     delay = Math.max(0, delay); // Ensure delay is not negative

//     logger.info(
//       `Scheduling auto check-out for booking ${bookingId} with delay of ${delay}ms`
//     );

//     await bookingQueue.add(
//       'auto-check-out',
//       { bookingId },
//       {
//         delay,
//         jobId: `check-out-${bookingId}`,
//       }
//     );

//     return { status: 'success', message: 'Auto check-out scheduled' };
//   } catch (error) {
//     logger.error(
//       `Error scheduling auto check-out for booking ${bookingId}:`,
//       error
//     );
//     throw error;
//   }
// };

// export const scheduleAllReminders = async (booking) => {
//   try {
//     const bookingId = booking._id.toString();
//     const startTime = new Date(booking.checkIn);
//     const endTime = new Date(booking.checkOut);

//     // Add validation to prevent NaN errors
//     if (isNaN(startTime.getTime())) {
//       logger.error(
//         `Invalid checkIn date for booking ${bookingId}: ${booking.checkIn}`
//       );
//       throw new Error(`Invalid check-in date for booking ${bookingId}`);
//     }

//     if (isNaN(endTime.getTime())) {
//       logger.error(
//         `Invalid checkOut date for booking ${bookingId}: ${booking.checkOut}`
//       );
//       throw new Error(`Invalid check-out date for booking ${bookingId}`);
//     }

//     logger.info(`Scheduling reminders for booking ${bookingId}`, {
//       checkIn: startTime.toISOString(),
//       checkOut: endTime.toISOString(),
//     });
//     // First, schedule a test reminder with 10 seconds delay for immediate testing
//     // await bookingQueue.add(
//     //   'notify-day-before-test',
//     //   { bookingId },
//     //   {
//     //     delay: 10000, // 10 seconds delay for testing
//     //     jobId: `test-reminder-${bookingId}`,
//     //   }
//     // );
//     // logger.info(
//     //   `Test reminder scheduled for booking ${bookingId} (10 second delay)`
//     // );

//     await scheduleReminderDayBefore(bookingId, startTime);
//     await schedule15MinReminder(bookingId, startTime);
//     await scheduleAutoCheckIn(bookingId, startTime);
//     await scheduleAutoCheckOut(bookingId, endTime);

//     logger.info(`All reminders scheduled for booking ${bookingId}`);
//     return { status: 'success', message: 'All reminders scheduled' };
//   } catch (error) {
//     logger.error(`Error scheduling reminders for booking:`, error);
//     throw error;
//   }
// };

// export const cancelAllReminders = async (bookingId) => {
//   try {
//     await bookingQueue.removeJobs(`day-before-${bookingId}`);
//     await bookingQueue.removeJobs(`15min-before-${bookingId}`);
//     await bookingQueue.removeJobs(`check-in-${bookingId}`);
//     await bookingQueue.removeJobs(`check-out-${bookingId}`);

//     logger.info(`All reminders canceled for booking ${bookingId}`);
//     return { status: 'success', message: 'All reminders canceled' };
//   } catch (error) {
//     logger.error(`Error canceling reminders for booking ${bookingId}:`, error);
//     throw error;
//   }
// };

// // Test function to schedule a reminder quickly
// export const scheduleTestReminder = async (bookingId) => {
//   try {
//     logger.info(`Scheduling test reminder for booking ${bookingId}`);
//     await bookingQueue.add(
//       'notify-day-before-test',
//       { bookingId },
//       {
//         delay: 5000, // 5 seconds delay for testing
//         jobId: `test-reminder-${bookingId}`,
//       }
//     );
//     return { status: 'success', message: 'Test reminder scheduled' };
//   } catch (error) {
//     logger.error(`Error scheduling test reminder:`, error);
//     throw error;
//   }
// };

// // Setup event listeners
// bookingQueueEvents.on('failed', ({ jobId, failedReason }) => {
//   logger.error(`Booking job ${jobId} failed with error: ${failedReason}`);
// });

// bookingQueueEvents.on('completed', ({ jobId, returnvalue }) => {
//   logger.info(`Booking job ${jobId} completed with result:`, returnvalue);
// });

// // For starting/stopping the queue
// export const startBookingQueue = async () => {
//   try {
//     await bookingQueue.waitUntilReady();
//     await bookingQueueEvents.waitUntilReady();
//     logger.info('Booking queue initialized successfully');
//     return true;
//   } catch (error) {
//     logger.error('Error starting booking queue:', error);
//     throw error;
//   }
// };

// export const stopBookingQueue = async () => {
//   try {
//     await bookingQueue.close();
//     logger.info('Booking queue closed successfully');
//     return true;
//   } catch (error) {
//     logger.error('Error stopping booking queue:', error);
//     throw error;
//   }
// };

// export default {
//   bookingQueue,
//   scheduleReminderDayBefore,
//   schedule15MinReminder,
//   scheduleAutoCheckIn,
//   scheduleAutoCheckOut,
//   scheduleAllReminders,
//   cancelAllReminders,
//   scheduleTestReminder,
//   startBookingQueue,
//   stopBookingQueue,
// };

// queue/bookingQueue.js
import { Queue, QueueEvents } from 'bullmq';
import { redisConnection } from '../jobs/redis-connection.js';
import { vercelQueueClient } from './vercelQueueClient.js';
import { logger } from '../utils/logger.js';
import { isWorker, isVercel } from '../utils/environment.js';

// Vercel-specific implementation using lightweight client
const scheduleAllRemindersVercel = async (booking) => {
  try {
    const bookingId = booking._id.toString();
    const startTime = new Date(booking.checkIn);
    const endTime = new Date(booking.checkOut);

    // Validation
    if (isNaN(startTime.getTime())) {
      throw new Error(`Invalid check-in date for booking ${bookingId}`);
    }
    if (isNaN(endTime.getTime())) {
      throw new Error(`Invalid check-out date for booking ${bookingId}`);
    }

    const now = Date.now();
    const results = [];

    // Test reminder (10 seconds)
    // try {
    //   await vercelQueueClient.addJob(
    //     'notify-day-before-test',
    //     { bookingId },
    //     { delay: 10000, jobId: `test-reminder-${bookingId}` }
    //   );
    //   results.push('test reminder scheduled');
    // } catch (error) {
    //   logger.warn('Failed to schedule test reminder:', error);
    // }

    // Day before reminder
    const dayBeforeTime = startTime.getTime() - 24 * 60 * 60 * 1000;
    if (dayBeforeTime > now) {
      await vercelQueueClient.addJob(
        'notify-day-before',
        { bookingId },
        { delay: dayBeforeTime - now, jobId: `day-before-${bookingId}` }
      );
      results.push('day-before reminder scheduled');
    }

    // 15 minute reminder
    const fifteenMinBefore = startTime.getTime() - 15 * 60 * 1000;
    if (fifteenMinBefore > now) {
      await vercelQueueClient.addJob(
        'notify-15min-before',
        { bookingId },
        { delay: fifteenMinBefore - now, jobId: `15min-before-${bookingId}` }
      );
      results.push('15-min reminder scheduled');
    }

    // Auto check-in
    if (startTime.getTime() > now) {
      await vercelQueueClient.addJob(
        'auto-check-in',
        { bookingId },
        { delay: startTime.getTime() - now, jobId: `check-in-${bookingId}` }
      );
      results.push('auto check-in scheduled');
    }

    // Auto check-out
    if (endTime.getTime() > now) {
      await vercelQueueClient.addJob(
        'auto-check-out',
        { bookingId },
        { delay: endTime.getTime() - now, jobId: `check-out-${bookingId}` }
      );
      results.push('auto check-out scheduled');
    }

    logger.info(
      `Reminders scheduled for booking ${bookingId} (Vercel mode):`,
      results
    );
    return {
      status: 'success',
      message: 'All reminders scheduled',
      details: results,
    };
  } catch (error) {
    logger.error('Error scheduling reminders (Vercel):', error);
    throw error;
  }
};

// Normal implementation for Railway/Development
const scheduleAllRemindersNormal = async (booking) => {
  try {
    const bookingId = booking._id.toString();
    const startTime = new Date(booking.checkIn);
    const endTime = new Date(booking.checkOut);

    // Validation
    if (isNaN(startTime.getTime())) {
      throw new Error(
        `Invalid check-in date for booking ${bookingId}: ${booking.checkIn}`
      );
    }
    if (isNaN(endTime.getTime())) {
      throw new Error(
        `Invalid check-out date for booking ${bookingId}: ${booking.checkOut}`
      );
    }

    logger.info(`Scheduling reminders for booking ${bookingId}`, {
      checkIn: startTime.toISOString(),
      checkOut: endTime.toISOString(),
    });

    // Test reminder (10 seconds)
    // await bookingQueue.add(
    //   'notify-day-before-test',
    //   { bookingId },
    //   {
    //     delay: 10000,
    //     jobId: `test-reminder-${bookingId}`,
    //   }
    // );

    // Schedule all reminders
    await scheduleReminderDayBefore(bookingId, startTime);
    await schedule15MinReminder(bookingId, startTime);
    await scheduleAutoCheckIn(bookingId, startTime);
    await scheduleAutoCheckOut(bookingId, endTime);

    logger.info(
      `All reminders scheduled for booking ${bookingId} (Worker mode)`
    );
    return { status: 'success', message: 'All reminders scheduled' };
  } catch (error) {
    logger.error(`Error scheduling reminders for booking:`, error);
    throw error;
  }
};

// Individual scheduling functions (used by normal implementation)
export const scheduleReminderDayBefore = async (bookingId, scheduledTime) => {
  try {
    const startTimeMillis = new Date(scheduledTime).getTime();
    if (isNaN(startTimeMillis)) {
      throw new Error(`Invalid booking start time: ${scheduledTime}`);
    }

    const reminderTime = new Date(startTimeMillis);
    reminderTime.setDate(reminderTime.getDate() - 1);

    const now = new Date();
    let delay = reminderTime.getTime() - now.getTime();
    delay = Math.max(0, delay);

    logger.info(
      `Scheduling day-before reminder for booking ${bookingId} with delay of ${delay}ms`
    );

    await bookingQueue.add(
      'notify-day-before',
      { bookingId },
      {
        delay,
        jobId: `day-before-${bookingId}`,
      }
    );

    return { status: 'success', message: 'Day before reminder scheduled' };
  } catch (error) {
    logger.error(
      `Error scheduling day-before reminder for booking ${bookingId}:`,
      error
    );
    throw error;
  }
};

export const schedule15MinReminder = async (bookingId, scheduledTime) => {
  try {
    const reminderTime = new Date(scheduledTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 15);

    const now = new Date();
    let delay = reminderTime.getTime() - now.getTime();
    delay = Math.max(0, delay);

    logger.info(
      `Scheduling 15-min reminder for booking ${bookingId} with delay of ${delay}ms`
    );

    await bookingQueue.add(
      'notify-15min-before',
      { bookingId },
      {
        delay,
        jobId: `15min-before-${bookingId}`,
      }
    );

    return { status: 'success', message: '15-minute reminder scheduled' };
  } catch (error) {
    logger.error(
      `Error scheduling 15-min reminder for booking ${bookingId}:`,
      error
    );
    throw error;
  }
};

export const scheduleAutoCheckIn = async (bookingId, scheduledTime) => {
  try {
    const now = new Date();
    let delay = new Date(scheduledTime).getTime() - now.getTime();
    delay = Math.max(0, delay);

    logger.info(
      `Scheduling auto check-in for booking ${bookingId} with delay of ${delay}ms`
    );

    await bookingQueue.add(
      'auto-check-in',
      { bookingId },
      {
        delay,
        jobId: `check-in-${bookingId}`,
      }
    );

    return { status: 'success', message: 'Auto check-in scheduled' };
  } catch (error) {
    logger.error(
      `Error scheduling auto check-in for booking ${bookingId}:`,
      error
    );
    throw error;
  }
};

export const scheduleAutoCheckOut = async (bookingId, endTime) => {
  try {
    const now = new Date();
    let delay = new Date(endTime).getTime() - now.getTime();
    delay = Math.max(0, delay);

    logger.info(
      `Scheduling auto check-out for booking ${bookingId} with delay of ${delay}ms`
    );

    await bookingQueue.add(
      'auto-check-out',
      { bookingId },
      {
        delay,
        jobId: `check-out-${bookingId}`,
      }
    );

    return { status: 'success', message: 'Auto check-out scheduled' };
  } catch (error) {
    logger.error(
      `Error scheduling auto check-out for booking ${bookingId}:`,
      error
    );
    throw error;
  }
};

// Main export function that chooses implementation
export const scheduleAllReminders = async (booking) => {
  if (!isWorker() && isVercel()) {
    return scheduleAllRemindersVercel(booking);
  }
  return scheduleAllRemindersNormal(booking);
};

// Cancel reminders (works for both environments)
export const cancelAllReminders = async (bookingId) => {
  try {
    if (!isWorker() && isVercel()) {
      // For Vercel, we can't cancel jobs directly
      logger.info(
        `Reminder cancellation noted for booking ${bookingId} (Vercel mode)`
      );
      return { status: 'success', message: 'Cancellation noted' };
    }

    // For Worker mode
    await bookingQueue.removeJobs(`day-before-${bookingId}`);
    await bookingQueue.removeJobs(`15min-before-${bookingId}`);
    await bookingQueue.removeJobs(`check-in-${bookingId}`);
    await bookingQueue.removeJobs(`check-out-${bookingId}`);
    await bookingQueue.removeJobs(`test-reminder-${bookingId}`);

    logger.info(`All reminders canceled for booking ${bookingId}`);
    return { status: 'success', message: 'All reminders canceled' };
  } catch (error) {
    logger.error(`Error canceling reminders for booking ${bookingId}:`, error);
    throw error;
  }
};

// Only create the actual queue if in worker mode or development
let bookingQueue;
let bookingQueueEvents;

if (isWorker() || (!isVercel() && redisConnection)) {
  bookingQueue = new Queue('bookingQueue', {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 24 * 3600,
      },
    },
  });

  if (isWorker()) {
    bookingQueueEvents = new QueueEvents('bookingQueue', {
      connection: redisConnection,
    });

    bookingQueueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`Booking job ${jobId} failed:`, failedReason);
    });

    bookingQueueEvents.on('completed', ({ jobId, returnvalue }) => {
      logger.info(`Booking job ${jobId} completed`);
    });
  }
}

// Queue lifecycle management
export const startBookingQueue = async () => {
  if (!bookingQueue) {
    logger.info('No booking queue to start (Vercel mode)');
    return true;
  }

  try {
    await bookingQueue.waitUntilReady();
    if (bookingQueueEvents) {
      await bookingQueueEvents.waitUntilReady();
    }
    logger.info('Booking queue initialized successfully');
    return true;
  } catch (error) {
    logger.error('Error starting booking queue:', error);
    throw error;
  }
};

export const stopBookingQueue = async () => {
  if (!bookingQueue) {
    return true;
  }

  try {
    await bookingQueue.close();
    if (bookingQueueEvents) {
      await bookingQueueEvents.close();
    }
    logger.info('Booking queue closed successfully');
    return true;
  } catch (error) {
    logger.error('Error stopping booking queue:', error);
    throw error;
  }
};

// Export everything
export { bookingQueue };

export default {
  bookingQueue,
  scheduleAllReminders,
  scheduleReminderDayBefore,
  schedule15MinReminder,
  scheduleAutoCheckIn,
  scheduleAutoCheckOut,
  cancelAllReminders,
  startBookingQueue,
  stopBookingQueue,
};
