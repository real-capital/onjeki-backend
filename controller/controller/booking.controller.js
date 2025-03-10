// controllers/booking.controller.js
import { validationResult } from 'express-validator';
import BookingService from '../../services/booking/booking.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import BookingModel from '../../models/booking.model.js';
import { BookingStatus } from '../../enum/booking.enum.js';
import PaystackService from '../../services/payment/payment.service.js';
import { logger } from '../../utils/logger.js';

const paystackService = new PaystackService();

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
    this.initiatePayment = this.initiatePayment.bind(this);
    this.verifyPayment = this.verifyPayment.bind(this);
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

  async initiatePayment(req, res, next) {
    const { paymentMethod } = req.body;
    const userId = req.user.id; // Assume user is authenticated and ID is available

    try {
      const result = await this.bookingService.initiatePayment(
        req.params.id,
        userId,
        paymentMethod
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async verifyPayment(req, res, next) {
    const { reference } = req.body;
    const userId = req.user.id; // Assume user is authenticated

    try {
      const result = await this.bookingService.verifyPayment(reference, userId);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async callback(req, res) {
    try {
      const { reference, status } = req.query;

      if (!reference) {
        return res.status(400).json({
          status: 'error',
          message: 'No reference provided',
        });
      }

      try {
        // Verify the transaction with Paystack
        const verificationResult = await paystackService.verifyTransaction(
          reference
        );

        // Find the associated payment
        const payment = await PaymentModel.findOne({
          transactionReference: reference,
        }).populate('booking');

        if (!payment) {
          logger.error('Payment not found for reference', { reference });
          return res.status(404).json({
            status: 'error',
            message: 'Payment record not found',
          });
        }

        // Determine redirect URL based on payment status
        let redirectUrl;
        if (verificationResult.status === 'success') {
          // Update payment and booking status
          await this.bookingService.confirmBookingPayment(payment.booking._id);
          redirectUrl = `onjeki://payment?reference=${reference}&status=success`;
        } else {
          await this.bookingService.handlePaymentFailure(payment.booking._id);
          redirectUrl = `onjeki://payment?reference=${reference}&status=failed`;
        }

        res.redirect(redirectUrl);
      } catch (verificationError) {
        logger.error('Payment verification failed', {
          reference,
          error: verificationError,
        });
        const errorRedirectUrl = `onjeki://payment?reference=${reference}&status=error`;
        res.redirect(errorRedirectUrl);
      }
    } catch (error) {
      logger.error('Paystack callback error', error);
      res.redirect('onjeki://payment?status=error');
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

      booking.status = BookingStatus.CONFIRMED;
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
