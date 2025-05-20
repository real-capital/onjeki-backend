// queue/bookingQueue.js
import { Queue, QueueEvents } from 'bullmq';
import { redisConnection } from '../jobs/redis-connection.js';
import { logger } from '../utils/logger.js';
import IORedis from 'ioredis';

// Determine if we're using a real or mock Redis connection
const isRealRedis = redisConnection instanceof IORedis;

// Create the booking queue
export const bookingQueue = isRealRedis
  ? new Queue('bookingQueue', {
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
    })
  : {
      // Mock implementation
      async add(name, data, options) {
        logger.info(`[MOCK] Added job to queue: ${name}`, { data, options });
        return { id: `mock-job-${Date.now()}` };
      },
      async removeJobs(jobId) {
        logger.info(`[MOCK] Removed job: ${jobId}`);
        return true;
      },
      async waitUntilReady() {
        return true;
      },
      async close() {
        return true;
      },
    };

// Create queue events listener
const bookingQueueEvents = new QueueEvents('bookingQueue', {
  connection: redisConnection,
});

// Schedule reminder for day before booking
export const scheduleReminderDayBefore = async (bookingId, scheduledTime) => {
  try {
    // Validate the input time
    const startTimeMillis = new Date(scheduledTime).getTime();
    if (isNaN(startTimeMillis)) {
      logger.error(
        `Invalid scheduledTime for booking ${bookingId}: ${scheduledTime}`
      );
      throw new Error(`Invalid booking start time: ${scheduledTime}`);
    }

    // Calculate delay with validation
    const reminderTime = new Date(startTimeMillis);
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
// Schedule all reminders for a booking
export const scheduleAllReminders = async (booking) => {
  try {
    const bookingId = booking._id.toString();

    // CHANGE THIS: Use checkIn and checkOut instead of startTime and endTime
    const startTime = new Date(booking.checkIn);
    const endTime = new Date(booking.checkOut);

    // Add validation to prevent NaN errors
    if (isNaN(startTime.getTime())) {
      logger.error(
        `Invalid checkIn date for booking ${bookingId}: ${booking.checkIn}`
      );
      throw new Error(`Invalid check-in date for booking ${bookingId}`);
    }

    if (isNaN(endTime.getTime())) {
      logger.error(
        `Invalid checkOut date for booking ${bookingId}: ${booking.checkOut}`
      );
      throw new Error(`Invalid check-out date for booking ${bookingId}`);
    }

    logger.info(`Scheduling reminders for booking ${bookingId}`, {
      checkIn: startTime.toISOString(),
      checkOut: endTime.toISOString(),
    });
    // First, schedule a test reminder with 10 seconds delay for immediate testing
    await bookingQueue.add(
      'notify-day-before-test',
      { bookingId },
      {
        delay: 10000, // 10 seconds delay for testing
        jobId: `test-reminder-${bookingId}`,
      }
    );
    logger.info(
      `Test reminder scheduled for booking ${bookingId} (10 second delay)`
    );

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
// export const scheduleAllReminders = async (booking) => {
//   try {
//     const bookingId = booking._id.toString();
//     const startTime = new Date(booking.startTime);
//     const endTime = new Date(booking.endTime);

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
