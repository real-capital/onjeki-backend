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
import PaystackService from '../payment/payment.service.js';
import RefundService from '../payment/refund.service.js';
import EarningService from '../payment/earning.service.js';
import EarningModel from '../../models/earning.model.js';
// import PushNotificationService from '../notification/push_notification_service.js';

const paystackService = new PaystackService();
const refundService = new RefundService();
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
  async checkAvailability(propertyId, startDate, endDate) {
    // 1. Check for existing bookings (confirmed or pending)
    const existingBooking = await BookingModel.findOne({
      property: propertyId,
      status: { $in: ['CONFIRMED', 'PENDING'] },
      $or: [
        { checkIn: { $lt: endDate }, checkOut: { $gt: startDate } },
        { checkIn: { $lt: endDate }, checkOut: null },
        { checkIn: null, checkOut: { $gt: startDate } },
      ],
    });

    if (existingBooking) return false;

    // 2. Check for blocked dates in the availability schema
    const blockedDates = await PropertyModel.findOne({
      _id: propertyId,
      'availability.blockedDates': {
        $elemMatch: {
          startDate: { $lt: endDate },
          endDate: { $gt: startDate },
        },
      },
    });

    if (blockedDates) return false;

    // 3. Check for booked dates in availability.bookedDates
    const property = await PropertyModel.findById(propertyId).lean();

    if (!property) return false;

    const isBooked = property.availability?.bookedDates?.some((booking) => {
      return (
        new Date(booking.startDate) < endDate &&
        new Date(booking.endDate) > startDate
      );
    });

    if (isBooked) return false;

    // 4. Check calendar entries for blocked dates
    const calendar = await PropertyModel.findOne({
      _id: propertyId,
      'availability.calendar': {
        $elemMatch: {
          date: { $gte: startDate, $lte: endDate },
          isBlocked: true,
        },
      },
    });

    if (calendar) return false;

    return true;
  }

  // async checkAvailability(propertyId, checkIn, checkOut) {
  //   try {
  //     const startDate = new Date(checkIn);
  //     const endDate = new Date(checkOut);
  //     console.log(startDate);
  //     console.log(endDate);

  //     // 1. Check if there are any overlapping bookings
  //     // const existingBooking = await BookingModel.findOne({
  //     //   property: propertyId,
  //     //   status: { $in: ['CONFIRMED', 'PENDING'] },
  //     //   $or: [
  //     //     {
  //     //       checkIn: { $lt: endDate },
  //     //       checkOut: { $gt: startDate },
  //     //     },
  //     //     {
  //     //       checkIn: { $gte: startDate, $lt: endDate },
  //     //     },
  //     //     {
  //     //       checkOut: { $gt: startDate, $lte: endDate },
  //     //     },
  //     //   ],
  //     // });
  //     const existingBooking = await BookingModel.findOne({
  //       property: propertyId,
  //       status: { $in: ['CONFIRMED', 'PENDING'] },
  //       checkIn: { $lt: endDate },
  //       checkOut: { $gt: startDate },
  //     });

  //     console.log('existingBooking');
  //     console.log(existingBooking);
  //     if (existingBooking) {
  //       return false; // Dates are already booked
  //     }

  //     // 2. Check if the property is blocked for these dates (Blocked Dates)
  //     const blockedDates = await PropertyModel.findOne({
  //       _id: propertyId,
  //       'availability.blockedDates.startDate': { $lt: endDate },
  //       'availability.blockedDates.endDate': { $gt: startDate },
  //     });

  //     console.log('blockedDates');
  //     console.log(blockedDates);

  //     if (blockedDates) {
  //       return false; // Dates are blocked
  //     }

  //     // 3. Check if the property is already booked for these dates (Booked Dates in availability model)
  //     const property = await PropertyModel.findOne({
  //       _id: propertyId,
  //     });

  //     if (
  //       property.availability &&
  //       property.availability.bookedDates.length > 0
  //     ) {
  //       const overlappingBooking = property.availability.bookedDates.some(
  //         (booking) => {
  //           const bookedStart = new Date(booking.startDate);
  //           const bookedEnd = new Date(booking.endDate);

  //           // Check if the requested dates overlap with any booked dates
  //           return (
  //             (bookedStart < endDate && bookedEnd > startDate) ||
  //             (bookedStart >= startDate && bookedStart < endDate) ||
  //             (bookedEnd > startDate && bookedEnd <= endDate)
  //           );
  //         }
  //       );

  //       console.log('overlappingBooking');
  //       console.log(overlappingBooking);

  //       if (overlappingBooking) {
  //         return false; // Dates are already booked
  //       }
  //     }

  //     // 4. Check the property calendar to see if the dates are blocked
  //     const calendar = await PropertyModel.findOne({
  //       _id: propertyId,
  //       'availability.calendar.date': { $gte: startDate, $lte: endDate },
  //       'availability.calendar.isBlocked': true,
  //     });

  //     console.log('calendar');
  //     console.log(calendar);

  //     if (calendar) {
  //       return false; // Dates are blocked in the calendar
  //     }

  //     return true; // Dates are available
  //   } catch (error) {
  //     console.log(error);
  //     throw new HttpException(400, error);
  //   }
  // }

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

      console.log('isPropAvailable');
      console.log(isPropAvailable);

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

      // ✅ Commit transaction before external async operations
      await session.commitTransaction();
      session.endSession(); // End session immediately after commit

      // Send notifications after transaction is committed
      // await this.sendBookingNotifications(booking);

      return {
        booking,
        payment: payment[0],
        paymentOptions: await this.getPaymentOptions(),
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

  async getPaymentOptions() {
    return [
      {
        id: 'CARD',
        name: 'Credit/Debit Card',
        description: 'Pay with your card',
        icon: 'card_icon.png',
      },
      {
        id: 'BANK_TRANSFER',
        name: 'Bank Transfer',
        description: 'Pay directly from your bank',
        icon: 'bank_transfer_icon.png',
      },
      // {
      //   id: 'ussd',
      //   name: 'USSD',
      //   description: 'Pay via USSD code',
      //   icon: 'ussd_icon.png',
      // },
      {
        id: 'BANK',
        name: 'Bank',
        description: 'Pay through your bank app',
        icon: 'bank_icon.png',
      },
    ];
  }

  // Method to initiate payment
  async initiatePayment(bookingId, userId, paymentMethod) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the booking
      const booking = await BookingModel.findOne({
        _id: bookingId,
        guest: userId,
        status: BookingStatus.PENDING,
      }).populate('guest property');

      if (!booking) {
        throw new HttpException(404, 'Booking not found or already processed');
      }

      // Find the associated payment
      const payment = await PaymentModel.findOne({
        booking: bookingId,
        status: 'PENDING',
      });

      if (!payment) {
        throw new HttpException(404, 'Payment record not found');
      }

      // Initialize Paystack transaction
      const paystackResponse = await paystackService.initializeTransaction({
        amount: payment.amount,
        email: booking.guest.email, // Assume you have guest email
        reference: `BOOKING_${bookingId}_${Date.now()}`,
        channels: [paymentMethod],
        metadata: {
          bookingId: booking._id,
          type: 'booking',
          userId: userId,
        },
      });

      // Update payment with transaction details
      payment.paymentMethod = paymentMethod;
      payment.transactionReference = paystackResponse.reference;
      payment.status = 'PROCESSING';
      await payment.save({ session });

      // Update booking timeline
      booking.timeline.push({
        status: 'PAYMENT_INITIATED',
        message: `Payment initiated via ${paymentMethod}`,
      });
      await booking.save({ session });

      await session.commitTransaction();

      return {
        paymentUrl: paystackResponse.authorization_url,
        reference: paystackResponse.reference,
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      console.log(error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // async getCallback(status, reference) {

  // }

  // Method to verify payment
  async verifyPayment(reference, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Verify transaction with Paystack
      const verificationResult = await paystackService.verifyTransaction(
        reference
      );

      // Find the payment
      const payment = await PaymentModel.findOne({
        transactionReference: reference,
      }).populate('booking');

      if (!payment) {
        throw new HttpException(404, 'Payment record not found');
      }

      // Ensure the payment belongs to the user
      if (payment.booking.guest.toString() !== userId) {
        throw new HttpException(403, 'Unauthorized access to payment');
      }

      // Update payment status
      payment.status =
        verificationResult.status === 'success' ? 'PAID' : 'FAILED';
      payment.gatewayResponse = verificationResult;
      payment.paidAt = new Date();
      await payment.save({ session });

      // Update booking status if payment is successful
      const booking = payment.booking;
      if (payment.status === 'PAID') {
        booking.status = BookingStatus.CONFIRMED;
        booking.timeline.push({
          status: 'PAYMENT_CONFIRMED',
          message: 'Payment successfully completed',
        });
        await booking.save({ session });

        // Trigger any post-payment processes (e.g., notifications)
        await this.sendBookingNotifications(booking);
      }

      await session.commitTransaction();

      return {
        booking,
        payment,
      };
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
  }
  // Method to confirm booking payment
  async confirmBookingPayment(bookingId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the booking
      const booking = await BookingModel.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Find the associated payment
      const payment = await PaymentModel.findOne({ booking: bookingId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Update payment status
      payment.status = 'PAID';
      payment.paidAt = new Date();
      await payment.save({ session });

      // Update booking status
      booking.status = BookingStatus.CONFIRMED;
      booking.payment.status = 'PAID';
      booking.timeline.push({
        status: 'PAYMENT_CONFIRMED',
        message: 'Payment successfully completed',
      });
      await booking.save({ session });

      // Find the availability for the property
      const property = await PropertyModel.findOne({
        'availability.bookedDates.bookingId': bookingId,
      }).session(session);

      if (!property) {
        throw new Error('Property or booked date not found');
      }

      // Find the booked date and update its status to 'CONFIRMED'
      const bookedDate = property.availability.bookedDates.find(
        (date) => date.bookingId.toString() === bookingId.toString()
      );

      if (!bookedDate) {
        throw new Error('Booked date not found');
      }

      bookedDate.status = BookingStatus.CONFIRMED;

      // Save the updated property availability
      await property.save({ session });
      // Create earning record for the host
      const earningService = new EarningService();
      await earningService.createEarning(booking);

      await session.commitTransaction();

      // Send confirmation notifications
      await this.sendBookingNotifications(booking);

      return booking;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Booking payment confirmation failed', {
        bookingId,
        error,
      });
      throw error;
    } finally {
      session.endSession();
    }
  }
  // Method to handle payment failure
  async handlePaymentFailure(bookingId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the booking
      const booking = await BookingModel.findById(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Find the associated payment
      const payment = await PaymentModel.findOne({ booking: bookingId });
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Update payment status
      payment.status = 'FAILED';
      await payment.save({ session });

      // Update booking status
      booking.status = BookingStatus.CANCELLED;
      booking.timeline.push({
        status: 'PAYMENT_FAILED',
        message: 'Payment process was unsuccessful',
      });
      await booking.save({ session });

      // Remove booked dates from property
      const property = await PropertyModel.findById(booking.property);
      await property.removeBookedDates(bookingId);

      // Send failure notifications
      await this.sendPaymentFailureNotifications(booking);

      await session.commitTransaction();

      return booking;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Payment failure handling failed', {
        bookingId,
        error,
      });
      throw error;
    } finally {
      session.endSession();
    }
  }

  async handlePaymentCancellation(bookingId, userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the booking
      const booking = await BookingModel.findOne({
        _id: bookingId,
        guest: userId,
        status: BookingStatus.PENDING,
      }).populate('property');

      if (!booking) {
        throw new HttpException(404, 'Booking not found');
      }

      // Find the associated payment
      const payment = await PaymentModel.findOne({
        booking: bookingId,
        status: { $in: ['PENDING', 'PROCESSING'] },
      });

      // Update payment status
      if (payment) {
        payment.status = 'CANCELLED';
        await payment.save({ session });
      }

      // Revert property booked dates
      const property = booking.property;
      await property.removeBookedDates(bookingId);

      // Update booking status
      booking.status = BookingStatus.CANCELLED;
      booking.timeline.push({
        status: 'PAYMENT_CANCELLED',
        message: 'Payment process was cancelled by user',
      });
      await booking.save({ session });

      // Send notification about payment cancellation
      await this.sendPaymentCancellationNotification(booking);

      await session.commitTransaction();

      return booking;
    } catch (error) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  async sendPaymentFailureNotification(booking) {
    // Send email to guest about payment failure
    await emailService.sendPaymentFailureEmail(booking);

    // Create notification record
    await NotificationModel.create({
      user: booking.guest,
      type: 'PAYMENT_FAILED',
      title: 'Payment Failed',
      message: `Payment for booking ${booking._id} was unsuccessful`,
      booking: booking._id,
    });
  }

  async sendPaymentCancellationNotification(booking) {
    // Send email to guest about payment cancellation
    await emailService.sendPaymentCancellationEmail(booking);

    // Create notification record
    await NotificationModel.create({
      user: booking.guest,
      type: 'PAYMENT_CANCELLED',
      title: 'Payment Cancelled',
      message: `Payment for booking ${booking._id} was cancelled`,
      booking: booking._id,
    });
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
    try {
      const booking = await BookingModel.findOne({
        _id: bookingId,
        guest: userId,
        // $or: [{ guest: userId }, { host: userId }],
      })
        .populate('guest', 'name email photo phoneNumber')
        .populate('host', 'name email photo phoneNumber')
        .populate({
          path: 'property',
          select: 'title location rules photo guests owner', // Only fetch specific fields for property
          populate: {
            path: 'owner',
            select: 'name email phoneNumber', // Only fetch selected fields for owner
          },
        })
        .sort('-createdAt');

      if (!booking) {
        throw new HttpException(404, 'Booking not found');
      }

      return booking;
    } catch (error) {
      throw new HttpException(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Error fetching bookings'
      );
    }
  }

  async cancelBooking(bookingId, userId, reason) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const booking = await BookingModel.findOne({
        _id: bookingId,
        guest: userId,
        // status: { $in: ['PENDING', 'CONFIRMED'] },
      });

      if (!booking) {
        throw new HttpException(
          404,
          'Booking not found or cannot be cancelled'
        );
      }

      // Calculate refund amount based on cancellation policy
      const refundAmount = await booking.calculateRefundAmount(booking);

      // Update booking status
      booking.status = BookingStatus.CANCELLED;
      booking.cancellation = {
        cancelledBy: userId,
        reason,
        cancelledAt: new Date(),
        refundAmount,
        refundStatus: 'Pending',
      };
      booking.timeline.push({
        status: 'CANCELLED',
        message: `Booking cancelled by guest: ${reason}`,
      });

      await booking.save();

      // Find associated earning
      const earning = await EarningModel.findOne({ booking: bookingId });
      if (earning) {
        // Update earning status to cancelled
        earning.status = 'cancelled';
        earning.notes = 'Booking was cancelled';
        await earning.save({ session });

        logger.info('Earning marked as cancelled due to booking cancellation', {
          earningId: earning._id,
          bookingId,
        });
      }
      // Remove booked dates from property
      const property = await PropertyModel.findById(booking.property);
      await property.removeBookedDates(bookingId);

      // Process refund if payment was made
      if (booking.payment.status === 'PAID') {
        await refundService.processRefund(booking, userId);
      }
      await session.commitTransaction();
      // Send notifications
      await this.sendCancellationNotifications(booking);

      return booking;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error handling booking cancellation', {
        bookingId,
        error,
      });
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getUserBookings(userId) {
    try {
      const query = { guest: userId };
      // if (status) {
      //   query.status = status;
      // }

      const bookings = await BookingModel.find(query)
        .populate('guest', 'name email photo phoneNumber')
        .populate('host', 'name email photo phoneNumber')
        .populate({
          path: 'property',
          select: 'title location rules photo guests owner', // Only fetch specific fields for property
          populate: {
            path: 'owner',
            select: 'name email phoneNumber', // Only fetch selected fields for owner
          },
        })
        .sort('-createdAt'); // Converts Mongoose docs to plain JavaScript objects
      return bookings;

      // return bookings;
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
