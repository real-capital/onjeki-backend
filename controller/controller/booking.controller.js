// controllers/booking.controller.js
import { validationResult } from 'express-validator';
import BookingService from '../../services/booking/booking.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import BookingModel from '../../models/booking.model.js';

class BookingController {
  constructor() {
    this.bookingService = new BookingService();
  }

  async createBooking(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new HttpException(StatusCodes.BAD_REQUEST, errors.array());
      }

      const booking = await this.bookingService.createBooking(
        req.body,
        req.user._id
      );

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  confirmBooking = async (req, res, next) => {
    try {
      const booking = await BookingModel.findOne({
        _id: req.params.id,
        host: req.user.id,
        status: 'Pending',
      });

      if (!booking) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Booking not found or cannot be confirmed'
        );
      }

      booking.status = 'Confirmed';
      await booking.save();

      // Send notifications
      // await sendBookingNotification(booking, 'booking_confirmed');

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: { booking },
      });
    } catch (error) {}
  };

  async getUserBookings(req, res, next) {
    try {
      const bookings = await this.bookingService.getUserBookings(
        req.user._id,
        req.query.status
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const booking = await this.bookingService.cancelBooking(
        req.params.bookingId,
        req.user._id,
        req.body.reason
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default BookingController;
