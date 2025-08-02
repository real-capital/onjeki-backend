
// import { Worker } from 'bullmq';
// import BookingModel from '../models/booking.model.js';
// import emailService from '../services/email/otpMail.service.js';
// import NotificationService from '../services/notification/notification.service.js';
// import BookingService from '../services/booking/booking.service.js';
// import { redisConnection } from '../jobs/redis-connection.js';
// import { logger } from '../utils/logger.js';
// import { BookingStatus } from '../enum/booking.enum.js';
// import { isWorker } from '../utils/environment.js';

// // Initialize services
// const notificationService = new NotificationService();
// const bookingService = new BookingService();

// // Only create worker if we're in worker environment
// let worker = null;

// if (isWorker() && redisConnection) {
//   const workerOptions = {
//     connection: redisConnection,
//     concurrency: 5,
//     removeOnComplete: {
//       age: 3600,
//       count: 1000,
//     },
//     removeOnFail: {
//       age: 24 * 3600,
//     },
//   };

//   worker = new Worker(
//     'bookingQueue',
//     async (job) => {
//       const { bookingId } = job.data;
//       logger.info(`📩 Processing ${job.name} for booking ${bookingId}`);

//       switch (job.name) {
//         case 'notify-day-before':
//           const booking = await BookingModel.findById(bookingId);
//           if (!booking) throw new Error(`Booking ${bookingId} not found`);
//           await emailService.sendCheckInReminderEmail(booking);
//           return { status: 'success', message: 'Check-in reminder email sent' };

//         case 'notify-15min-before':
//           const booking15 = await BookingModel.findById(bookingId);
//           if (!booking15) throw new Error(`Booking ${bookingId} not found`);
//           return { status: 'success', message: '15-minute notification sent' };

//         case 'auto-check-in':
//           const bookingIn = await BookingModel.findById(bookingId);
//           if (!bookingIn) throw new Error(`Booking ${bookingId} not found`);

//           if (!bookingIn.checkInDetails.isCheckedIn) {
//             bookingIn.checkInDetails.isCheckedIn = true;
//             bookingIn.checkInDetails.actualCheckInTime = new Date();
//             bookingIn.status = BookingStatus.CHECKED_IN;
//             bookingIn.timeline.push({
//               status: 'CHECKED_IN',
//               message: 'Auto-checked in by system',
//             });

//             await bookingIn.save();
//             await emailService.sendCheckInConfirmationEmail(bookingIn);
//             return { status: 'success', message: 'Auto check-in completed' };
//           }
//           return { status: 'skipped', message: 'Already checked in' };

//         case 'auto-check-out':
//           const bookingOut = await BookingModel.findById(bookingId);
//           if (!bookingOut) throw new Error(`Booking ${bookingId} not found`);
//           await bookingService.completeBooking(bookingId);
//           return {
//             status: 'success',
//             message: 'Booking completed successfully',
//           };

//         default:
//           logger.warn(`No processor for job ${job.name}`);
//           return { status: 'error', message: `Unknown job type: ${job.name}` };
//       }
//     },
//     workerOptions
//   );

//   // Event listeners
//   worker.on('active', (job) => {
//     logger.info(`Job ${job.id} has started processing`, {
//       name: job.name,
//       data: job.data,
//     });
//   });

//   worker.on('completed', (job, result) => {
//     logger.info(`Job ${job.id} (${job.name}) completed`);
//   });

//   worker.on('failed', (job, err) => {
//     logger.error(`Job ${job.id} (${job.name}) failed:`, {
//       error: err.message,
//       stack: err.stack,
//     });
//   });

//   // Process handlers
//   process.on('SIGTERM', async () => {
//     logger.info('SIGTERM received. Closing booking worker...');
//     if (worker) await worker.close();
//     process.exit(0);
//   });

//   process.on('SIGINT', async () => {
//     logger.info('SIGINT received. Closing booking worker...');
//     if (worker) await worker.close();
//     process.exit(0);
//   });

//   logger.info('Booking worker started and listening for jobs...');
// } else {
//   logger.info('Booking worker not started (not in worker environment)');
// }

// export default worker;


import { Worker } from 'bullmq';
import BookingModel from '../models/booking.model.js';
import emailService from '../services/email/otpMail.service.js';
import NotificationService from '../services/notification/notification.service.js';
import BookingService from '../services/booking/booking.service.js';
import { createBullMQRedisConnection } from '../config/redis.js'; // Changed import
import { logger } from '../utils/logger.js';
import { BookingStatus } from '../enum/booking.enum.js';
import { isWorker } from '../utils/environment.js';

// Initialize services
const notificationService = new NotificationService();
const bookingService = new BookingService();
// Only create worker if we're in worker environment
let worker = null;

if (isWorker()) {
  try {
    // Create BullMQ-compatible Redis connection
    const bullmqRedis = createBullMQRedisConnection();
    
    const workerOptions = {
      connection: bullmqRedis, // Use BullMQ-compatible connection
      concurrency: 5,
      removeOnComplete: {
        age: 3600,
        count: 1000,
      },
      removeOnFail: {
        age: 24 * 3600,
      },
    };

    worker = new Worker(
      'bookingQueue',
      async (job) => {
        const { bookingId } = job.data;
        logger.info(`📩 Processing ${job.name} for booking ${bookingId}`);

        try {
          switch (job.name) {
            case 'notify-day-before':
              const booking = await BookingModel.findById(bookingId);
              if (!booking) throw new Error(`Booking ${bookingId} not found`);
              await emailService.sendCheckInReminderEmail(booking);
              return { status: 'success', message: 'Check-in reminder email sent' };

            case 'notify-15min-before':
              const booking15 = await BookingModel.findById(bookingId);
              if (!booking15) throw new Error(`Booking ${bookingId} not found`);
              // Add your 15-minute notification logic here
              return { status: 'success', message: '15-minute notification sent' };

            case 'auto-check-in':
              const bookingIn = await BookingModel.findById(bookingId);
              if (!bookingIn) throw new Error(`Booking ${bookingId} not found`);

              if (!bookingIn.checkInDetails.isCheckedIn) {
                bookingIn.checkInDetails.isCheckedIn = true;
                bookingIn.checkInDetails.actualCheckInTime = new Date();
                bookingIn.status = BookingStatus.CHECKED_IN;
                bookingIn.timeline.push({
                  status: 'CHECKED_IN',
                  message: 'Auto-checked in by system',
                });

                await bookingIn.save();
                await emailService.sendCheckInConfirmationEmail(bookingIn);
                return { status: 'success', message: 'Auto check-in completed' };
              }
              return { status: 'skipped', message: 'Already checked in' };

            case 'auto-check-out':
              const bookingOut = await BookingModel.findById(bookingId);
              if (!bookingOut) throw new Error(`Booking ${bookingId} not found`);
              await bookingService.completeBooking(bookingId);
              return {
                status: 'success',
                message: 'Booking completed successfully',
              };

            default:
              logger.warn(`No processor for job ${job.name}`);
              return { status: 'error', message: `Unknown job type: ${job.name}` };
          }
        } catch (error) {
          logger.error(`Error processing job ${job.name} for booking ${bookingId}:`, error);
          throw error; // Re-throw to trigger BullMQ retry mechanism
        }
      },
      workerOptions
    );

    // Event listeners
    worker.on('active', (job) => {
      logger.info(`Job ${job.id} has started processing`, {
        name: job.name,
        data: job.data,
      });
    });

    worker.on('completed', (job, result) => {
      logger.info(`✅ Job ${job.id} (${job.name}) completed successfully`, result);
    });

    worker.on('failed', (job, err) => {
      logger.error(`❌ Job ${job.id} (${job.name}) failed:`, {
        error: err.message,
        stack: err.stack,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      });
    });

    worker.on('stalled', (jobId) => {
      logger.warn(`⚠️ Job ${jobId} stalled`);
    });

    worker.on('progress', (job, progress) => {
      logger.info(`📊 Job ${job.id} progress: ${progress}%`);
    });

    // Process handlers
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Closing booking worker...');
      if (worker) {
        await worker.close();
        logger.info('✅ Booking worker closed gracefully');
      }
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received. Closing booking worker...');
      if (worker) {
        await worker.close();
        logger.info('✅ Booking worker closed gracefully');
      }
    });

    logger.info('✅ Booking worker started and listening for jobs...');
  } catch (error) {
    logger.error('❌ Failed to create booking worker:', error);
    worker = null;
  }
} else {
  logger.info('Booking worker not started (not in worker environment)');
}

export default worker;