import 'dotenv/config';
import { Worker } from 'bullmq';
import NotificationService from './services/notification/notification.service.js';
import BookingService from './services/booking/booking.service.js';
import emailService from './services/email/otpMail.service.js';
import BookingModel from './models/booking.model.js';
import bookingQueue from './queue/bookingQueue.js';
import { logger } from './utils/logger.js';
import { redisConnection } from './jobs/redis-connection.js';

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err);
  process.exit(1);
});

// const bookingService = new BookingService();
const notificationService = new NotificationService();

// bookingQueue.process('notify-day-before-test', async (job) => {
//   const { bookingId } = job.data;
//   console.log(
//     `📩 [notify-day-before-test] Processing job for booking ${bookingId}`
//   );
//   logger.info(
//     `📩 [notify-day-before-test] Processing job for booking ${bookingId}`
//   );

//   const booking = await BookingModel.findById(bookingId);
//   if (!booking) throw new Error(`Booking ${bookingId} not found`);

//   try {
//     await emailService.sendCheckInReminderEmail(booking);
//     logger.info(`Check-in Reminder email sent for booking ${booking._id}`);
//   } catch (emailError) {
//     logger.error(
//       `Failed to send check-in Reminder email for booking ${booking._id}:`,
//       emailError
//     );
//   }
// });

// bookingQueue.process('notify-day-before', async (job) => {
//   const { bookingId } = job.data;
//   console.log(`📩 [notify-day-before] Processing job for booking ${bookingId}`);

//   const booking = await BookingModel.findById(bookingId);
//   if (!booking) throw new Error(`Booking ${bookingId} not found`);

//   try {
//     await emailService.sendCheckInReminderEmail(booking);
//     logger.info(`Check-in Reminder email sent for booking ${booking._id}`);
//   } catch (emailError) {
//     logger.error(
//       `Failed to send check-in Reminder email for booking ${booking._id}:`,
//       emailError
//     );
//   }
// });

// bookingQueue.process('notify-15min-before', async (job) => {
//   const { bookingId } = job.data;
//   const booking = await BookingModel.findById(bookingId);

//   if (!booking) throw new Error(`Booking ${bookingId} not found`);

//   await notificationService.notifyUser(
//     booking.guest,
//     `Reminder: Your booking starts in 15 minutes.`
//   );
// });

// bookingQueue.process('auto-check-in', async (job) => {
//   const { bookingId } = job.data;
//   const booking = await BookingModel.findById(bookingId);

//   if (!booking) throw new Error(`Booking ${bookingId} not found`);

//   if (booking.checkInDetails.isCheckedIn) return;

//   booking.checkInDetails.isCheckedIn = true;
//   booking.checkInDetails.actualCheckInTime = new Date();
//   booking.status = 'CHECKED_IN';
//   booking.timeline.push({
//     status: 'CHECKED_IN',
//     message: 'Auto-checked in by system',
//   });
//   await booking.save();
//   try {
//     await emailService.sendCheckInConfirmationEmail(booking);
//     logger.info(`Check-in confirmation email sent for booking ${booking._id}`);
//   } catch (emailError) {
//     logger.error(
//       `Failed to send check-in confirmation email for booking ${booking._id}:`,
//       emailError
//     );
//   }

//   await notificationService.notifyUser(
//     booking.guest,
//     'You have been automatically checked in.'
//   );
// });

// bookingQueue.process('auto-check-out', async (job) => {
//   const { bookingId } = job.data;
//   await bookingService.completeBooking(bookingId);
// });

// bookingQueue.on('failed', (job, err) => {
//   console.error(`Job ${job.id} failed:`, err);
// });

const worker = new Worker(
  'bookingQueue',
  async (job) => {
    const { bookingId } = job.data;

    switch (job.name) {
      case 'notify-day-before-test':
      case 'notify-day-before':
        console.log(`📩 Processing ${job.name} for booking ${bookingId}`);
        const booking = await BookingModel.findById(bookingId);
        if (!booking) throw new Error(`Booking ${bookingId} not found`);
        await emailService.sendCheckInReminderEmail(booking);
        break;

      case 'notify-15min-before':
        const booking15 = await BookingModel.findById(bookingId);
        if (!booking15) throw new Error(`Booking ${bookingId} not found`);
        //   await notificationService.notifyUser(booking15.guest, 'Reminder: Your booking starts in 15 minutes.');
        break;

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
          // await notificationService.notifyUser(bookingIn.guest, 'You have been automatically checked in.');
        }
        break;

      case 'auto-check-out':
        // Assuming you have bookingService.completeBooking implemented
        const bookingOut = await BookingModel.findById(bookingId);
        if (!bookingOut) throw new Error(`Booking ${bookingId} not found`);
        await bookingService.completeBooking(bookingId);
        // perform checkout logic here
        break;

      default:
        console.log(`No processor for job ${job.name}`);
    }
  },
  { connection: redisConnection }
);

worker.on('completed', (job) => {
  console.log(`Job ${job.id} (${job.name}) completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} (${job.name}) failed:`, err);
});

console.log('Worker started and listening for booking queue jobs...');

// setInterval(() => {
//   console.log('⏳ Worker is alive...');
// }, 30000);
