// controllers/booking.controller.js
import { validationResult } from 'express-validator';
import BookingService from '../../services/booking/booking.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';

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
        data: booking
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserBookings(req, res, next) {
    try {
      const bookings = await this.bookingService.getUserBookings(
        req.user._id,
        req.query.status
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: bookings
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const booking = await this.bookingService.cancelBooking(
        req.params.bookingId,
        req.user._id
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: booking
      });
    } catch (error) {
      next(error);
    }
  }
}

export default BookingController;