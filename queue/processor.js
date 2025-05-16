// const bookingQueue = require('./bookingQueue');
// const { BookingModel } = require('../models/Booking');
// const BookingService = require('../services/BookingService');
// const NotificationService = require('../services/NotificationService');

// const bookingService = new BookingService();
// const notificationService = new NotificationService();

// bookingQueue.process('notify-day-before', async (job) => {
//   const { bookingId } = job.data;
//   const booking = await BookingModel.findById(bookingId);

//   if (!booking) throw new Error(`Booking ${bookingId} not found`);

//   await notificationService.notifyUser(
//     booking.guest,
//     `Reminder: Your booking at property ${booking.property} starts tomorrow.`
//   );
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

//   await notificationService.notifyUser(booking.guest, 'You have been automatically checked in.');
// });

// bookingQueue.process('auto-check-out', async (job) => {
//   const { bookingId } = job.data;
//   await bookingService.completeBooking(bookingId);
// });

// bookingQueue.on('failed', (job, err) => {
//   console.error(`Job ${job.id} failed:`, err);
// });
