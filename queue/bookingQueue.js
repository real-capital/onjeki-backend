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
// export const cancelAllReminders = async (bookingId) => {
//   try {
//     if (!isWorker() && isVercel()) {
//       // For Vercel, we can't cancel jobs directly
//       logger.info(
//         `Reminder cancellation noted for booking ${bookingId} (Vercel mode)`
//       );
//       return { status: 'success', message: 'Cancellation noted' };
//     }

//     // For Worker mode
//     await bookingQueue.removeJobs(`day-before-${bookingId}`);
//     await bookingQueue.removeJobs(`15min-before-${bookingId}`);
//     await bookingQueue.removeJobs(`check-in-${bookingId}`);
//     await bookingQueue.removeJobs(`check-out-${bookingId}`);
//     await bookingQueue.removeJobs(`test-reminder-${bookingId}`);

//     logger.info(`All reminders cancelled for booking ${bookingId}`);
//     return { status: 'success', message: 'All reminders cancelled' };
//   } catch (error) {
//     logger.error(`Error canceling reminders for booking ${bookingId}:`, error);
//     throw error;
//   }
// };

export const cancelAllReminders = async (bookingId) => {
  try {
    const jobIds = [
      `day-before-${bookingId}`,
      `15min-before-${bookingId}`,
      `check-in-${bookingId}`,
      `check-out-${bookingId}`,
      `test-reminder-${bookingId}`
    ];

    if (!isWorker() && isVercel()) {
      const results = [];
      
      for (const jobId of jobIds) {
        try {
          // First, check if job exists
          const job = await vercelQueueClient.getJob(jobId);
          if (!job) {
            results.push({ jobId, status: 'not_found' });
            continue;
          }

          // Try multiple cancellation methods
          let cancelled = false;
          const methods = [
            () => vercelQueueClient.removeJob(jobId),
            () => vercelQueueClient.cancelJob(jobId),
            () => vercelQueueClient.deleteJob(jobId),
            () => job.remove(),
            () => job.cancel()
          ];

          for (const method of methods) {
            try {
              await method();
              cancelled = true;
              break;
            } catch (e) {
              // Try next method
            }
          }

          results.push({ 
            jobId, 
            status: cancelled ? 'cancelled' : 'failed',
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          logger.error(`Error cancelling job ${jobId}:`, error);
          results.push({ jobId, status: 'error', error: error.message });
        }
      }

      // Verify cancellation
      const verification = [];
      for (const jobId of jobIds) {
        try {
          const stillExists = await vercelQueueClient.getJob(jobId);
          if (stillExists) {
            verification.push(jobId);
          }
        } catch (e) {
          // Job doesn't exist (good)
        }
      }

      if (verification.length > 0) {
        logger.warn(`Jobs still exist after cancellation:`, verification);
      }

      logger.info(`Vercel queue cancellation completed for booking ${bookingId}:`, {
        results,
        stillExists: verification
      });

      return { 
        status: 'success', 
        message: 'Cancellation completed',
        cancelled: results.filter(r => r.status === 'cancelled').length,
        failed: results.filter(r => r.status === 'failed').length,
        stillExists: verification.length,
        results 
      };
    }

    // Worker mode logic remains the same...
    await bookingQueue.removeJobs(`day-before-${bookingId}`);
    await bookingQueue.removeJobs(`15min-before-${bookingId}`);
    await bookingQueue.removeJobs(`check-in-${bookingId}`);
    await bookingQueue.removeJobs(`check-out-${bookingId}`);
    await bookingQueue.removeJobs(`test-reminder-${bookingId}`);

    logger.info(`All reminders cancelled for booking ${bookingId}`);
    return { status: 'success', message: 'All reminders cancelled' };
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

export const clearQueue = async () => {
  if (!bookingQueue) {
    throw new Error('Queue not available');
  }

  try {
    console.log('Starting complete queue cleanup...');

    // Step 1: Pause the queue to stop processing
    await bookingQueue.pause();
    console.log('Queue paused');

    // Step 2: Clean all job states
    await bookingQueue.clean(0, 10000, 'completed');
    console.log('Completed jobs cleaned');

    await bookingQueue.clean(0, 10000, 'failed');
    console.log('Failed jobs cleaned');

    await bookingQueue.clean(0, 10000, 'active');
    console.log('Active jobs cleaned');

    await bookingQueue.clean(0, 10000, 'delayed');
    console.log('Delayed jobs cleaned');

    // Step 3: Drain waiting jobs
    await bookingQueue.drain();
    console.log('Waiting jobs drained');

    // Step 4: Get remaining jobs and remove manually
    const remainingJobs = [
      ...(await bookingQueue.getWaiting()),
      ...(await bookingQueue.getActive()),
      ...(await bookingQueue.getCompleted()),
      ...(await bookingQueue.getFailed()),
      ...(await bookingQueue.getDelayed()),
    ];

    console.log(`Found ${remainingJobs.length} remaining jobs`);

    for (const job of remainingJobs) {
      try {
        await job.remove();
      } catch (error) {
        console.log(`Could not remove job ${job.id}:`, error.message);
      }
    }

    // Step 5: Resume the queue
    await bookingQueue.resume();
    console.log('Queue resumed');

    // Step 6: Verify cleanup
    const finalStats = await getQueueStats();
    console.log('Final queue stats:', finalStats);

    return finalStats;
    // Method 2: Complete obliteration (use carefully!)
    // await bookingQueue.obliterate();
  } catch (error) {
    logger.error('Error clearing booking queue:', error);
    throw error;
  }
};
async function getQueueStats() {
  if (!bookingQueue) {
    return { error: 'Queue not available' };
  }

  const waiting = await bookingQueue.getWaiting();
  const active = await bookingQueue.getActive();
  const completed = await bookingQueue.getCompleted();
  const failed = await bookingQueue.getFailed();
  const delayed = await bookingQueue.getDelayed();

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
    total:
      waiting.length +
      active.length +
      completed.length +
      failed.length +
      delayed.length,
  };
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
  clearQueue,
  scheduleReminderDayBefore,
  schedule15MinReminder,
  scheduleAutoCheckIn,
  scheduleAutoCheckOut,
  cancelAllReminders,
  startBookingQueue,
  stopBookingQueue,
};
