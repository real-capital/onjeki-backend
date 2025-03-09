// controllers/booking.controller.js
import { validationResult } from 'express-validator';
import BookingService from '../../services/booking/booking.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import BookingModel from '../../models/booking.model.js';

class BookingController {
  constructor(bookingService) {
    if (!bookingService) {
      throw new Error('BookingService is required');
    }
    this.bookingService = bookingService;

    // Bind all methods to this instance
    this.calculatePrice = this.calculatePrice.bind(this);
    this.getBooking = this.getBooking.bind(this);
    this.cancelBooking = this.cancelBooking.bind(this);
    this.createBooking = this.createBooking.bind(this);
    this.confirmBooking = this.confirmBooking.bind(this);
    this.getUserBookings = this.getUserBookings.bind(this);
    this.getHostBookings = this.getHostBookings.bind(this);
    this.getPendingBookings = this.getPendingBookings.bind(this);
    this.acceptBooking = this.acceptBooking.bind(this);
    this.rejectBooking = this.rejectBooking.bind(this);
  }

  // Convert methods to arrow functions to automatically bind them
  calculatePrice = async (req, res, next) => {
    try {
      const { propertyId } = req.params;
      const { checkIn, checkOut, guests } = req.body;

      const pricing = await this.bookingService.calculateBookingPrice(
        propertyId,
        checkIn,
        checkOut,
        guests
      );

      res.json({
        status: 'success',
        data: pricing,
      });
    } catch (error) {
      next(error);
    }
  };

  getBooking = async (req, res, next) => {
    try {
      const booking = await this.bookingService.getBookingById(
        req.params.bookingId,
        req.user._id
      );

      res.json({
        status: 'success',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  };

  createBooking = async (req, res, next) => {
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
  };

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

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: { booking },
      });
    } catch (error) {
      next(error);
    }
  };

  getUserBookings = async (req, res, next) => {
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
  };

  getHostBookings = async (req, res, next) => {
    try {
      const bookings = await this.bookingService.getHostBooking(req.user._id);

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  };

  getPendingBookings = async (req, res, next) => {
    try {
      const bookings = await this.bookingService.getPendingBookings(
        req.user._id
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  };

  acceptBooking = async (req, res, next) => {
    try {
      const booking = await this.bookingService.acceptBooking(
        req.params.id,
        req.user._id
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  };

  rejectBooking = async (req, res, next) => {
    try {
      const booking = await this.bookingService.rejectBooking(
        req.params.id,
        req.user._id
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelBooking = async (req, res, next) => {
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
  };
}

export default BookingController;
