import 'dotenv/config';
import NotificationService from './services/notification/notification.service.js';
import BookingService from './services/booking/booking.service.js';
import emailService from './services/email/otpMail.service.js';
import BookingModel from './models/booking.model.js';
import bookingQueue from './queue/bookingQueue.js';
import { logger } from './utils/logger.js';
// import bookingQueue from './queue/bookingQueue.js';
// import { BookingModel } from './models/Booking.js';
// import BookingService from './services/booking/booking.service.js';
// import NotificationService from './services/notification.service.js';

const bookingService = new BookingService();
const notificationService = new NotificationService();

bookingQueue.process('notify-day-before', async (job) => {
  const { bookingId } = job.data;
  const booking = await BookingModel.findById(bookingId);

  if (!booking) throw new Error(`Booking ${bookingId} not found`);

  await notificationService.notifyUser(
    booking.guest,
    `Reminder: Your booking at property ${booking.property} starts tomorrow.`
  );
});

bookingQueue.process('notify-15min-before', async (job) => {
  const { bookingId } = job.data;
  const booking = await BookingModel.findById(bookingId);

  if (!booking) throw new Error(`Booking ${bookingId} not found`);

  await notificationService.notifyUser(
    booking.guest,
    `Reminder: Your booking starts in 15 minutes.`
  );
});

bookingQueue.process('auto-check-in', async (job) => {
  const { bookingId } = job.data;
  const booking = await BookingModel.findById(bookingId);

  if (!booking) throw new Error(`Booking ${bookingId} not found`);

  if (booking.checkInDetails.isCheckedIn) return;

  booking.checkInDetails.isCheckedIn = true;
  booking.checkInDetails.actualCheckInTime = new Date();
  booking.status = 'CHECKED_IN';
  booking.timeline.push({
    status: 'CHECKED_IN',
    message: 'Auto-checked in by system',
  });
  await booking.save();
  try {
    await emailService.sendCheckInConfirmationEmail(booking);
    logger.info(`Check-in confirmation email sent for booking ${booking._id}`);
  } catch (emailError) {
    logger.error(
      `Failed to send check-in confirmation email for booking ${booking._id}:`,
      emailError
    );
  }

  await notificationService.notifyUser(
    booking.guest,
    'You have been automatically checked in.'
  );
});

bookingQueue.process('auto-check-out', async (job) => {
  const { bookingId } = job.data;
  await bookingService.completeBooking(bookingId);
});

bookingQueue.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

console.log('Worker started and listening for booking queue jobs...');
