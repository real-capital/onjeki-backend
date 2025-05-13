// jobs/booking-completion.js
import { logger } from '../../utils/logger.js';
import BookingService from '../../services/booking/booking.service.js';
import { BookingStatus } from '../../enum/booking.enum.js';
import BookingModel from '../../models/booking.model.js';

/**
 * Scheduled job to complete bookings after checkout date
 * Runs daily to find bookings that should be completed
 */
export async function completeExpiredBookings() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Find confirmed bookings with checkout date in the past
    const expiredBookings = await BookingModel.find({
      status: BookingStatus.CONFIRMED,
      checkOut: { $lt: yesterday }
    });
    
    logger.info(`Found ${expiredBookings.length} bookings to complete`);
    
    const bookingService = new BookingService(/* socketService instance */);
    let completedCount = 0;
    
    // Process each booking
    for (const booking of expiredBookings) {
      try {
        await bookingService.completeBooking(booking._id);
        completedCount++;
      } catch (error) {
        logger.error(`Failed to complete booking ${booking._id}`, error);
      }
    }
    
    logger.info(`Successfully completed ${completedCount} bookings`);
    return { completed: completedCount, total: expiredBookings.length };
  } catch (error) {
    logger.error('Error in completeExpiredBookings job', error);
    throw error;
  }
}