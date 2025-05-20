// // import Queue from 'bull';

// // const bookingQueue = new Queue('bookingQueue', process.env.REDIS_URL);

// // export default bookingQueue;

// import { Queue } from 'bullmq';
// import { redisConnection } from '../jobs/redis-connection.js';

// const bookingQueue = new Queue('bookingQueue', {
//   connection: redisConnection, // same Redis connection config everywhere
// });

// export default bookingQueue;

// queue/bookingQueue.js
import { Queue, QueueEvents } from 'bullmq';
import { redisConnection } from '../jobs/redis-connection.js';
import { logger } from '../utils/logger.js';

// Create the booking queue
const bookingQueue = new Queue('bookingQueue', {
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

// Create queue events listener
const bookingQueueEvents = new QueueEvents('bookingQueue', {
  connection: redisConnection,
});

// Schedule reminder for day before booking
export const scheduleReminderDayBefore = async (bookingId, scheduledTime) => {
  try {
    // Calculate delay: time until 24 hours before booking
    const reminderTime = new Date(scheduledTime);
    reminderTime.setDate(reminderTime.getDate() - 1);

    const now = new Date();
    let delay = reminderTime.getTime() - now.getTime();
    delay = Math.max(0, delay); // Ensure delay is not negative

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

// Schedule reminder for 15 minutes before booking
export const schedule15MinReminder = async (bookingId, scheduledTime) => {
  try {
    // Calculate delay: time until 15 minutes before booking
    const reminderTime = new Date(scheduledTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - 15);

    const now = new Date();
    let delay = reminderTime.getTime() - now.getTime();
    delay = Math.max(0, delay); // Ensure delay is not negative

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

// Schedule auto check-in at booking start time
export const scheduleAutoCheckIn = async (bookingId, scheduledTime) => {
  try {
    const now = new Date();
    let delay = new Date(scheduledTime).getTime() - now.getTime();
    delay = Math.max(0, delay); // Ensure delay is not negative

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

// Schedule auto check-out at booking end time
export const scheduleAutoCheckOut = async (bookingId, endTime) => {
  try {
    const now = new Date();
    let delay = new Date(endTime).getTime() - now.getTime();
    delay = Math.max(0, delay); // Ensure delay is not negative

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

// Schedule all reminders for a booking
export const scheduleAllReminders = async (booking) => {
  try {
    const bookingId = booking._id.toString();
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);

    await scheduleReminderDayBefore(bookingId, startTime);
    await schedule15MinReminder(bookingId, startTime);
    await scheduleAutoCheckIn(bookingId, startTime);
    await scheduleAutoCheckOut(bookingId, endTime);

    logger.info(`All reminders scheduled for booking ${bookingId}`);
    return { status: 'success', message: 'All reminders scheduled' };
  } catch (error) {
    logger.error(`Error scheduling reminders for booking:`, error);
    throw error;
  }
};

// Cancel all reminders for a booking
export const cancelAllReminders = async (bookingId) => {
  try {
    await bookingQueue.removeJobs(`day-before-${bookingId}`);
    await bookingQueue.removeJobs(`15min-before-${bookingId}`);
    await bookingQueue.removeJobs(`check-in-${bookingId}`);
    await bookingQueue.removeJobs(`check-out-${bookingId}`);

    logger.info(`All reminders canceled for booking ${bookingId}`);
    return { status: 'success', message: 'All reminders canceled' };
  } catch (error) {
    logger.error(`Error canceling reminders for booking ${bookingId}:`, error);
    throw error;
  }
};

// Test function to schedule a reminder quickly
export const scheduleTestReminder = async (bookingId) => {
  try {
    logger.info(`Scheduling test reminder for booking ${bookingId}`);
    await bookingQueue.add(
      'notify-day-before-test',
      { bookingId },
      {
        delay: 5000, // 5 seconds delay for testing
        jobId: `test-reminder-${bookingId}`,
      }
    );
    return { status: 'success', message: 'Test reminder scheduled' };
  } catch (error) {
    logger.error(`Error scheduling test reminder:`, error);
    throw error;
  }
};

// Setup event listeners
bookingQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Booking job ${jobId} failed with error: ${failedReason}`);
});

bookingQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info(`Booking job ${jobId} completed with result:`, returnvalue);
});

// For starting/stopping the queue
export const startBookingQueue = async () => {
  try {
    await bookingQueue.waitUntilReady();
    await bookingQueueEvents.waitUntilReady();
    logger.info('Booking queue initialized successfully');
    return true;
  } catch (error) {
    logger.error('Error starting booking queue:', error);
    throw error;
  }
};

export const stopBookingQueue = async () => {
  try {
    await bookingQueue.close();
    logger.info('Booking queue closed successfully');
    return true;
  } catch (error) {
    logger.error('Error stopping booking queue:', error);
    throw error;
  }
};

export default {
  bookingQueue,
  scheduleReminderDayBefore,
  schedule15MinReminder,
  scheduleAutoCheckIn,
  scheduleAutoCheckOut,
  scheduleAllReminders,
  cancelAllReminders,
  scheduleTestReminder,
  startBookingQueue,
  stopBookingQueue,
};
