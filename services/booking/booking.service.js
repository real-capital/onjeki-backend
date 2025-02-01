import BookingModel from '../../models/booking.model.js';
import { BookingStatus } from '../../enum/booking.enum.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import PropertyModel from '../../models/properties.model.js';

class BookingService {
  async createBooking(bookingData, userId) {
    try {
      // Check if property exists and is available
      const property = await PropertyModel.findById(bookingData.property);
      if (!property) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'Property not found');
      }

      // Check if dates are available
      if (
        !property.isAvailable(
          new Date(bookingData.checkIn),
          new Date(bookingData.checkOut)
        )
      ) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Property is not available for selected dates'
        );
      }

      if (property.isBooked) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Property is not available for booking'
        );
      }

      // Calculate total price
      const totalPrice = property.calculatePrice(
        new Date(checkIn),
        new Date(checkOut)
      );
      // const paymentIntent = await createPaymentIntent({
      //   amount: totalPrice,
      //   currency: property.pricing.currency,
      //   customerId: req.user.id,
      // });

      const checkInDate = new Date(bookingData.checkIn);
      const checkOutDate = new Date(bookingData.checkOut);
      const guests = new Date(bookingData.guests);

      // Create booking
      const booking = await BookingModel.create({
        property: property._id,
        guest: userId,
        host: property.owner,
        checkInDate,
        checkOutDate,
        guests,
        pricing: {
          nightlyRate: property.price.base,
          nights: Math.ceil(
            (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)
          ),
          cleaningFee: property.price.cleaningFee,
          serviceFee: property.price.serviceFee,
          total: totalPrice,
          currency: property.pricing.currency,
        },
      });

      // Send notifications
      // await sendBookingNotification(booking, 'new_booking');

      // if (property.isBooked) {
      //   throw new HttpException(
      //     StatusCodes.BAD_REQUEST,
      //     'Property is not available for booking'
      //   );
      // }

      // Calculate duration and total price
      // const startDate = new Date(bookingData.startDate);
      // const endDate = new Date(bookingData.endDate);
      // const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      // // let totalPrice = property.price * duration;
      // let discount = 0;

      // // Apply discounts based on duration and property settings
      // if (duration >= 30 && property.discount.monthlyBooking) {
      //   discount = (totalPrice * property.discount.monthlyBooking) / 100;
      // } else if (duration >= 7 && property.discount.weekBooking) {
      //   discount = (totalPrice * property.discount.weekBooking) / 100;
      // } else if (property.discount.firstBooking) {
      //   // Check if this is user's first booking
      //   const userBookings = await BookingModel.countDocuments({
      //     user: userId,
      //   });
      //   if (userBookings === 0) {
      //     discount = (totalPrice * property.discount.firstBooking) / 100;
      //   }
      // }

      // totalPrice -= discount;

      // const booking = new BookingModel({
      //   user: userId,
      //   property: property._id,
      //   startDate,
      //   endDate,
      //   duration,
      //   discount,
      //   totalPrice,
      //   status: BookingStatus.PENDING,
      // });

      await booking.save();

      // Update property status
      property.isBooked = true;
      await property.save();

      return {
        booking,
        // , clientSecret: paymentIntent.client_secret
      };
    } catch (error) {
      throw new HttpException(
        error.statusCode || StatusCodes.BAD_REQUEST,
        error.message
      );
    }
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
          'Booking is already canceled'
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
