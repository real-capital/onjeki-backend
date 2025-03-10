import BookingModel from '../../models/booking.model.js';
import { BookingStatus } from '../../enum/booking.enum.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import PropertyModel from '../../models/properties.model.js';
import mongoose from 'mongoose';
import NotificationModel from '../../models/notifications.model.js';
import emailService from '../../services/email/otpMail.service.js';
import { SocketService } from '../chat/socket.service.js';
import PaymentModel from '../../models/paymentModel.js';
import { logger } from '../../utils/logger.js';
// import PushNotificationService from '../notification/push_notification_service.js';

class BookingService {
  constructor(socketService) {
    if (!socketService) {
      throw new Error('SocketService is required for BookingService');
    }
    this.socketService = socketService;
  }
  async calculateBookingPrice(propertyId, checkIn, checkOut, guests) {
    const property = await PropertyModel.findById(propertyId);
    if (!property) {
      throw new HttpException(404, 'Property not found');
    }

    // Check if dates are available
    const isAvailable = await this.checkAvailability(
      propertyId,
      checkIn,
      checkOut
    );
    if (!isAvailable) {
      throw new HttpException(400, 'Property not available for selected dates');
    }

    // Calculate number of nights
    const nights = Math.ceil(
      (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
    );

    // Base price calculation
    let basePrice = property.price.base * nights;

    // Apply seasonal pricing if applicable
    // const seasonalPricing = await this.calculateSeasonalPricing(
    //   property,
    //   checkIn,
    //   checkOut
    // );
    // if (seasonalPricing) {
    //   basePrice = seasonalPricing;
    // }

    // Calculate additional guest fees
    const totalGuests = guests.adults + guests.children + guests.infant;
    let additionalGuestFee = 0;
    if (totalGuests > property.baseGuests) {
      const extraGuests = totalGuests - property.baseGuests;
      additionalGuestFee = extraGuests * property.price.extraGuestFee * nights;
    }

    // Calculate cleaning fee
    const cleaningFee = property.price.cleaningFee || 0;

    // Calculate service fee (e.g., 10% of base price)
    const serviceFee = basePrice * 0.1;

    // Calculate total before discounts
    let total = basePrice + additionalGuestFee;

    // Apply discounts
    let discount = 0;
    const daysUntilArrival = Math.ceil(
      (new Date(checkIn) - new Date()) / (1000 * 60 * 60 * 24)
    );

    // Apply Weekly Discount
    if (nights >= 7 && property.discounts?.weekly) {
      discount = total * (property.discounts.weekly / 100);
    }
    // Apply Monthly Discount
    else if (nights >= 30 && property.discounts?.monthly) {
      discount = total * (property.discounts.monthly / 100);
    }
    // Apply Early Bird Discount
    else if (
      property.discounts?.earlyBird &&
      daysUntilArrival >= (property.discounts.earlyBird.daysInAdvance || 30)
    ) {
      discount = total * (property.discounts.earlyBird.percentage / 100);
    }

    // Final total
    const finalTotal = total - discount;

    return {
      nightlyRate: property.price.base,
      nights,
      basePrice,
      additionalGuestFee,
      cleaningFee,
      serviceFee,
      discount,
      total: finalTotal,
      currency: property.price.currency || 'NGN',
      breakdown: {
        baseRate: `${nights} nights x ${property.price.base}`,
        additionalGuests:
          totalGuests > property.baseGuests
            ? `${extraGuests} extra guests x ${property.price.extraGuestFee}`
            : null,
        fees: {
          cleaning: cleaningFee,
          service: serviceFee,
        },
        discounts:
          discount > 0
            ? {
                type: nights >= 30 ? 'Monthly' : 'Weekly',
                amount: discount,
              }
            : null,
      },
    };
  }

  async checkAvailability(propertyId, checkIn, checkOut) {
    try {
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);
      console.log(startDate);
      console.log(endDate);

      // 1. Check if there are any overlapping bookings
      const existingBooking = await BookingModel.findOne({
        property: propertyId,
        status: { $in: ['CONFIRMED', 'PENDING'] },
        $or: [
          {
            checkIn: { $lt: endDate },
            checkOut: { $gt: startDate },
          },
          {
            checkIn: { $gte: startDate, $lt: endDate },
          },
          {
            checkOut: { $gt: startDate, $lte: endDate },
          },
        ],
      });
      console.log('existingBooking');
      console.log(existingBooking);
      if (existingBooking) {
        return false; // Dates are already booked
      }

      // 2. Check if the property is blocked for these dates (Blocked Dates)
      const blockedDates = await PropertyModel.findOne({
        _id: propertyId,
        'availability.blockedDates.startDate': { $lt: endDate },
        'availability.blockedDates.endDate': { $gt: startDate },
      });

      console.log('blockedDates');
      console.log(blockedDates);

      if (blockedDates) {
        return false; // Dates are blocked
      }

      // 3. Check if the property is already booked for these dates (Booked Dates in availability model)
      const property = await PropertyModel.findOne({
        _id: propertyId,
      });

      if (
        property.availability &&
        property.availability.bookedDates.length > 0
      ) {
        const overlappingBooking = property.availability.bookedDates.some(
          (booking) => {
            const bookedStart = new Date(booking.startDate);
            const bookedEnd = new Date(booking.endDate);

            // Check if the requested dates overlap with any booked dates
            return (
              (bookedStart < endDate && bookedEnd > startDate) ||
              (bookedStart >= startDate && bookedStart < endDate) ||
              (bookedEnd > startDate && bookedEnd <= endDate)
            );
          }
        );

        console.log('overlappingBooking');
        console.log(overlappingBooking);

        if (overlappingBooking) {
          return false; // Dates are already booked
        }
      }

      // 4. Check the property calendar to see if the dates are blocked
      const calendar = await PropertyModel.findOne({
        _id: propertyId,
        'availability.calendar.date': { $gte: startDate, $lte: endDate },
        'availability.calendar.isBlocked': true,
      });

      console.log('calendar');
      console.log(calendar);

      if (calendar) {
        return false; // Dates are blocked in the calendar
      }

      return true; // Dates are available
    } catch (error) {
      console.log(error);
      throw new HttpException(400, error);
    }
  }

  async createBooking(bookingData, userId) {
    console.log('creating');
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Verify property and availability
      const property = await PropertyModel.findById(bookingData.propertyId);
      if (!property) {
        throw new HttpException(404, 'Property not found');
      }
      // Check availability
      const isPropertyAvailable = property.isAvailable(
        bookingData.checkIn,
        bookingData.checkOut
      );

      if (!isPropertyAvailable) {
        throw new HttpException(
          400,
          'Property not available for selected dates'
        );
      }

      // Check availability again (in case someone booked while user was viewing)
      const isPropAvailable = await this.checkAvailability(
        bookingData.propertyId,
        bookingData.checkIn,
        bookingData.checkOut
      );

      if (!isPropAvailable) {
        throw new HttpException(
          400,
          'Property no longer available for selected dates'
        );
      }

      // Calculate final price
      const pricing = await this.calculateBookingPrice(
        bookingData.propertyId,
        bookingData.checkIn,
        bookingData.checkOut,
        bookingData.guests
      );

      // Create booking
      const booking = new BookingModel({
        guest: userId,
        property: bookingData.propertyId,
        host: property.owner,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        guests: bookingData.guests,
        pricing,
        status: BookingStatus.PENDING,
        timeline: [
          {
            status: 'CREATED',
            message: 'Booking request created',
          },
        ],
      });

      await booking.save({ session });
      // Update property's booked dates
      await property.updateBookedDates(booking);

      // Create payment record
      const payment = await PaymentModel.create(
        [
          {
            booking: booking._id,
            amount: pricing.total,
            currency: pricing.currency,
            status: 'PENDING',
          },
        ],
        { session }
      );

      // Update property availability
      // await PropertyModel.findByIdAndUpdate(
      //   bookingData.propertyId,
      //   {
      //     $push: {
      //       bookedDates: {
      //         start: bookingData.checkIn,
      //         end: bookingData.checkOut,
      //         bookingId: booking._id,
      //       },
      //     },
      //   },
      //   { session }
      // );

      // Notify host
      // await NotificationModel.create(
      //   [
      //     {
      //       user: property.owner,
      //       type: 'NEW_BOOKING',
      //       title: 'New Booking',
      //       booking: booking._id,
      //       message: 'New booking request received',
      //     },
      //   ],
      //   { session }
      // );

      // ✅ Commit transaction before external async operations
      await session.commitTransaction();
      session.endSession(); // End session immediately after commit

      // Send notifications after transaction is committed
      await this.sendBookingNotifications(booking);

      return {
        booking,
        payment: payment[0],
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction(); // ✅ Abort only if still in a transaction
      }
      // session.endSession();
      throw error;
    } finally {
      session.endSession();
    }
  }

  notifyHost(booking) {
    try {
      if (!this.socketService) {
        throw new Error('SocketService not initialized');
      }

      // Get socket instance if using singleton pattern
      const socketService =
        this.socketService instanceof SocketService
          ? this.socketService
          : SocketService.getInstance();

      if (!socketService) {
        throw new Error('Could not get SocketService instance');
      }

      socketService.notifyUser(booking.host, 'new_booking', {
        bookingId: booking._id,
        message: 'New booking request',
      });
    } catch (error) {
      logger.error('Error in notifyHost:', error);
      // Handle error appropriately without throwing
    }
  }

  async sendBookingNotifications(booking) {
    // Send email to host
    await emailService.sendBookingRequestEmail(booking);

    // Send push notification to host
    // await PushNotificationService.sendToHost(
    //   booking.host,
    //   'New Booking Request',
    //   `New booking request for ${booking.property.title}`
    // );

    // Send confirmation email to guest
    await emailService.sendBookingConfirmationEmail(booking);
    this.notifyHost(booking);
    const property = await PropertyModel.findById(booking.property);
    // Create notification record
    await NotificationModel.create({
      user: booking.host,
      type: 'NEW_BOOKING',
      title: 'New Booking Request',
      message: `New booking request for ${property.title}`,
      booking: booking._id,
      guest: booking.guest,
    });

    // Track host activity
    // await hostActivityService.trackActivity({
    //   host: booking.host,
    //   type: 'BOOKING',
    //   title: 'New Booking Request',
    //   booking: booking._id,
    //   metadata: {
    //     guestId: booking.guest,
    //     propertyId: booking.property._id,
    //     amount: booking.pricing.total,
    //   },
    // });
  }

  async getBookingById(bookingId, userId) {
    const booking = await BookingModel.findOne({
      _id: bookingId,
      $or: [{ guest: userId }, { host: userId }],
    })
      .populate('guest', 'name email photo phone')
      .populate('host', 'name email photo phone')
      .populate('property');

    if (!booking) {
      throw new HttpException(404, 'Booking not found');
    }

    return booking;
  }

  async cancelBooking(bookingId, userId, reason) {
    const booking = await BookingModel.findOne({
      _id: bookingId,
      guest: userId,
      status: { $in: ['PENDING', 'CONFIRMED'] },
    });

    if (!booking) {
      throw new HttpException(404, 'Booking not found or cannot be cancelled');
    }

    // Calculate refund amount based on cancellation policy
    const refundAmount = await this.calculateRefundAmount(booking);

    // Update booking status
    booking.status = BookingStatus.CANCELLED;
    booking.cancellation = {
      cancelledBy: userId,
      reason,
      cancelledAt: new Date(),
      refundAmount,
    };

    booking.timeline.push({
      status: 'CANCELLED',
      message: `Booking cancelled by guest: ${reason}`,
    });

    await booking.save();

    // Remove booked dates from property
    const property = await PropertyModel.findById(booking.property);
    await property.removeBookedDates(bookingId);

    // Process refund if payment was made
    if (booking.payment.status === 'PAID') {
      await this.processRefund(booking, refundAmount);
    }

    // Send notifications
    await this.sendCancellationNotifications(booking);

    return booking;
  }

  async getUserBookings(userId, status) {
    try {
      const query = { user: userId };
      if (status) {
        query.status = status;
      }

      const bookings = await BookingModel.find(query)
        .populate('property')
        .sort('-createdAt');

      return bookings;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching bookings'
      );
    }
  }

  async getHostBooking(userId) {
    try {
      const bookings = await BookingModel.find({ host: userId })
        .sort('-createdAt')
        .populate('guest', 'name email phone photo')
        .populate('property', 'title location photos');

      return bookings;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching bookings'
      );
    }
  }

  async getPendingBookings(userId) {
    try {
      const bookings = await BookingModel.find({
        host: userId,
        status: BookingStatus.PENDING,
      }).populate('guest property');

      return bookings;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching bookings'
      );
    }
  }
  async acceptBooking(bookingId, hostId) {
    try {
      const booking = await BookingModel.findOne({
        _id: bookingId,
        host: hostId,
        status: BookingStatus.PENDING,
      }).populate('guest property');

      if (!booking) {
        throw new HttpException(404, 'Booking not found');
      }

      await booking.acceptByHost();

      return booking;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching bookings'
      );
    }
  }
  async rejectBooking(bookingId, hostId) {
    try {
      const booking = await BookingModel.findOne({
        _id: bookingId,
        host: hostId,
        status: BookingStatus.PENDING,
      }).populate('guest property');

      if (!booking) {
        throw new HttpException(404, 'Booking not found');
      }

      await booking.rejectByHost();

      return booking;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching bookings'
      );
    }
  }
  async cancelBooking(bookingId, userId) {
    try {
      const booking = await BookingModel.findOne({
        _id: bookingId,
        user: userId,
      });

      if (!booking) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'Booking not found');
      }

      if (booking.status === BookingStatus.CANCELED) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Booking is already cancelled'
        );
      }
      await booking.cancel(req.user.id, reason);

      // booking.status = BookingStatus.CANCELED;
      // await booking.save();

      // Update property status
      await PropModel.findByIdAndUpdate(booking.property, {
        isBooked: false,
      });

      return booking;
    } catch (error) {
      throw new HttpException(
        error.statusCode || StatusCodes.BAD_REQUEST,
        error.message
      );
    }
  }
}

export default BookingService;
