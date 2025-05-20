// workers/bookingWorker.js
import { Worker } from 'bullmq';
import BookingModel from '../models/booking.model.js';
import emailService from '../services/email/otpMail.service.js';
import NotificationService from '../services/notification/notification.service.js';
import BookingService from '../services/booking/booking.service.js';
import { redisConnection } from '../jobs/redis-connection.js';
import { logger } from '../utils/logger.js';

// Initialize services
const notificationService = new NotificationService();
const bookingService = new BookingService();

const workerOptions = {
  connection: redisConnection,
  concurrency: 5,
  removeOnComplete: {
    age: 3600,
    count: 1000,
  },
  removeOnFail: {
    age: 24 * 3600,
  }
};

const worker = new Worker(
  'bookingQueue',
  async (job) => {
    const { bookingId } = job.data;
    logger.info(`📩 Processing ${job.name} for booking ${bookingId}`);

    switch (job.name) {
      case 'notify-day-before-test':
      case 'notify-day-before':
        const booking = await BookingModel.findById(bookingId);
        if (!booking) throw new Error(`Booking ${bookingId} not found`);
        await emailService.sendCheckInReminderEmail(booking);
        return { status: 'success', message: 'Check-in reminder email sent' };

      case 'notify-15min-before':
        const booking15 = await BookingModel.findById(bookingId);
        if (!booking15) throw new Error(`Booking ${bookingId} not found`);
        // Uncomment when your notification service is ready
        // await notificationService.notifyUser(booking15.guest, 'Reminder: Your booking starts in 15 minutes.');
        return { status: 'success', message: '15-minute notification sent' };

      case 'auto-check-in':
        const bookingIn = await BookingModel.findById(bookingId);
        if (!bookingIn) throw new Error(`Booking ${bookingId} not found`);
        
        if (!bookingIn.checkInDetails.isCheckedIn) {
          bookingIn.checkInDetails.isCheckedIn = true;
          bookingIn.checkInDetails.actualCheckInTime = new Date();
          bookingIn.status = 'CHECKED_IN';
          bookingIn.timeline.push({
            status: 'CHECKED_IN',
            message: 'Auto-checked in by system',
          });
          
          await bookingIn.save();
          await emailService.sendCheckInConfirmationEmail(bookingIn);
          // Uncomment when your notification service is ready
          // await notificationService.notifyUser(bookingIn.guest, 'You have been automatically checked in.');
          return { status: 'success', message: 'Auto check-in completed' };
        }
        return { status: 'skipped', message: 'Already checked in' };

      case 'auto-check-out':
        const bookingOut = await BookingModel.findById(bookingId);
        if (!bookingOut) throw new Error(`Booking ${bookingId} not found`);
        await bookingService.completeBooking(bookingId);
        return { status: 'success', message: 'Booking completed successfully' };

      default:
        logger.warn(`No processor for job ${job.name}`);
        return { status: 'error', message: `Unknown job type: ${job.name}` };
    }
  },
  workerOptions
);

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} (${job.name}) completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} (${job.name}) failed:`, err);
});

// Handle process shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing booking worker...');
  await worker.close();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Closing booking worker...');
  await worker.close();
});

logger.info('Booking worker started and listening for jobs...');

export default worker;