// import 'dotenv/config';
// import { Worker } from 'bullmq';
// import NotificationService from './services/notification/notification.service.js';
// import BookingService from './services/booking/booking.service.js';
// import emailService from './services/email/otpMail.service.js';
// import BookingModel from './models/booking.model.js';
// import bookingQueue from './queue/bookingQueue.js';
// import { logger } from './utils/logger.js';
// import { redisConnection } from './jobs/redis-connection.js';

// process.on('unhandledRejection', (err) => {
//   console.error('UNHANDLED REJECTION! 💥 Shutting down...');
//   console.error(err);
//   process.exit(1);
// });

// process.on('uncaughtException', (err) => {
//   console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
//   console.error(err);
//   process.exit(1);
// });

// // const bookingService = new BookingService();
// const notificationService = new NotificationService();

// const worker = new Worker(
//   'bookingQueue',
//   async (job) => {
//     const { bookingId } = job.data;

//     switch (job.name) {
//       case 'notify-day-before-test':
//       case 'notify-day-before':
//         console.log(`📩 Processing ${job.name} for booking ${bookingId}`);
//         const booking = await BookingModel.findById(bookingId);
//         if (!booking) throw new Error(`Booking ${bookingId} not found`);
//         await emailService.sendCheckInReminderEmail(booking);
//         break;

//       case 'notify-15min-before':
//         const booking15 = await BookingModel.findById(bookingId);
//         if (!booking15) throw new Error(`Booking ${bookingId} not found`);
//         //   await notificationService.notifyUser(booking15.guest, 'Reminder: Your booking starts in 15 minutes.');
//         break;

//       case 'auto-check-in':
//         const bookingIn = await BookingModel.findById(bookingId);
//         if (!bookingIn) throw new Error(`Booking ${bookingId} not found`);
//         if (!bookingIn.checkInDetails.isCheckedIn) {
//           bookingIn.checkInDetails.isCheckedIn = true;
//           bookingIn.checkInDetails.actualCheckInTime = new Date();
//           bookingIn.status = 'CHECKED_IN';
//           bookingIn.timeline.push({
//             status: 'CHECKED_IN',
//             message: 'Auto-checked in by system',
//           });
//           await bookingIn.save();
//           await emailService.sendCheckInConfirmationEmail(bookingIn);
//           // await notificationService.notifyUser(bookingIn.guest, 'You have been automatically checked in.');
//         }
//         break;

//       case 'auto-check-out':
//         // Assuming you have bookingService.completeBooking implemented
//         const bookingOut = await BookingModel.findById(bookingId);
//         if (!bookingOut) throw new Error(`Booking ${bookingId} not found`);
//         await bookingService.completeBooking(bookingId);
//         // perform checkout logic here
//         break;

//       default:
//         console.log(`No processor for job ${job.name}`);
//     }
//   },
//   { connection: redisConnection }
// );

// worker.on('completed', (job) => {
//   console.log(`Job ${job.id} (${job.name}) completed`);
// });

// worker.on('failed', (job, err) => {
//   console.error(`Job ${job.id} (${job.name}) failed:`, err);
// });

// console.log('Worker started and listening for booking queue jobs...');

// // setInterval(() => {
// //   console.log('⏳ Worker is alive...');
// // }, 30000);

// worker.js - Entry point for just the worker process
// import 'dotenv/config';
// import mongoose from 'mongoose';
// import { logger } from './utils/logger.js';

// // Connect to MongoDB
// mongoose
//   .connect(process.env.MONGODB_URI)
//   .then(() => logger.info('Connected to MongoDB'))
//   .catch((err) => logger.error('MongoDB connection error:', err));

// // Import the worker to start it
// import './workers/bookingWorker.js';

// logger.info('Booking worker service started');

// // Optional health check endpoint
// import express from 'express';
// const app = express();
// const PORT = process.env.PORT || 3000;

// app.get('/', (req, res) => {
//   res.send('Booking worker service is running');
// });

// app.get('/health', (req, res) => {
//   res.status(200).json({ status: 'ok', uptime: process.uptime() });
// });

// app.listen(PORT, () => {
//   logger.info(`Health check server running on port ${PORT}`);
// });

// worker.js
// worker.js
import 'dotenv/config';
import mongoose from 'mongoose';
import { logger } from './utils/logger.js';
import express from 'express';
import {
  startAllQueuesAndWorkers,
  stopAllQueuesAndWorkers,
} from './queue/queueManager.js';

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => logger.error('MongoDB connection error:', err));

// Start all queues and workers
(async () => {
  try {
    await startAllQueuesAndWorkers();
    logger.info('Worker service started successfully');
  } catch (error) {
    logger.error('Failed to start worker service:', error);
    process.exit(1);
  }
})();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down worker service...');
  await stopAllQueuesAndWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down worker service...');
  await stopAllQueuesAndWorkers();
  process.exit(0);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Worker service is running');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  logger.info(`Health check server running on port ${PORT}`);
});
