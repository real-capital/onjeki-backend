// controllers/booking.controller.js
import { validationResult } from 'express-validator';
import BookingService from '../../services/booking/booking.service.js';
import HttpException from '../../utils/exception.js';
import { StatusCodes } from 'http-status-codes';
import BookingModel from '../../models/booking.model.js';
import { BookingStatus } from '../../enum/booking.enum.js';
import PaystackService from '../../services/payment/payment.service.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import PaymentModel from '../../models/paymentModel.js';
import WebhookMonitorService from '../../services/payment/webhook_montor.service.js';

const paystackService = new PaystackService();
const webhookMonitorService = new WebhookMonitorService();

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
    this.handleChargeSuccess = this.handleChargeSuccess.bind(this);
    this.handleFailedCharge = this.handleFailedCharge.bind(this);
    this.handleChargeFailed = this.handleChargeFailed.bind(this);
    this.handleRefundProcessed = this.handleRefundProcessed.bind(this);
    this.webhook = this.webhook.bind(this);
    this.handlePaystackWebhook = this.handlePaystackWebhook.bind(this);
    this.handleSuccessfulCharge = this.handleSuccessfulCharge.bind(this);
  }

  async handlePaystackWebhook(req, res) {
    try {
      // Verify Paystack webhook signature
      const hash = crypto
        .createHmac(
          'sha512',
          process.env.PAYSTACK_SECRET_KEY ||
            'pk_test_0c2d1bd85ce2cde55fa53c812303cffacee4fe75'
        )
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        return res
          .status(401)
          .json({ status: 'error', message: 'Invalid signature' });
      }

      const event = req.body;
      console.log(event);

      switch (event.event) {
        case 'charge.success':
          await this.handleSuccessfulCharge(event.data);
          break;
        case 'charge.failed':
          await this.handleFailedCharge(event.data);
          break;
        case 'refund.processed':
          await this.handleRefundProcessed(event.data);
          break;
        default:
          console.log('Unhandled Paystack event:', event.event);
      }

      res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  }

  async webhook(req, res) {
    try {
      const paystackService = new PaystackService();

      // Verify webhook signature
      const isValidWebhook = paystackService.verifyWebhookSignature(
        req.body,
        req.headers['x-paystack-signature']
      );

      if (!isValidWebhook) {
        logger.warn('Invalid Paystack webhook', {
          body: req.body,
          headers: req.headers,
        });
        return res
          .status(401)
          .json({ status: 'error', message: 'Invalid webhook' });
      }

      const event = req.body;

      // Handle different Paystack events
      switch (event.event) {
        case 'charge.success':
          await this.handleChargeSuccess(event.data);
          break;
        case 'charge.failed':
          await this.handleChargeFailed(event.data);
          break;
        case 'refund.processed':
          await this.handleRefundProcessed(event.data);
          break;
        default:
          logger.info('Unhandled Paystack event', { event: event.event });
      }

      res.status(200).json({ status: 'success' });
    } catch (error) {
      logger.error('Webhook processing error', error);
      res
        .status(500)
        .json({ status: 'error', message: 'Webhook processing failed' });
    }
  }

  async handleSuccessfulCharge(data) {
    await webhookMonitorService.logWebhookEvent(
      'PAYSTACK',
      'charge.success',
      data,
      { success: true }
    );
  }

  async handleFailedCharge(data) {
    const payment = await PaymentModel.findOne({
      transactionReference: data.reference,
    }).populate('booking');

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Update payment status
    payment.status = 'FAILED';
    payment.gatewayResponse = data;
    await payment.save();

    await webhookMonitorService.logWebhookEvent(
      'PAYSTACK',
      'charge.fail',
      data,
      { success: true }
    );
    // Update booking status
    const booking = payment.booking;
    await this.bookingService.handlePaymentFailure(booking._id, booking.guest);
  }

  async handleRefundProcessed(data) {
    const payment = await PaymentModel.findOne({
      transactionReference: data.transaction_reference,
    }).populate('booking');

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Update payment status
    payment.status = 'REFUNDED';
    payment.refundedAt = new Date();
    payment.gatewayResponse = data;
    await payment.save();

    // Update booking status
    const booking = payment.booking;
    booking.status = BookingStatus.CANCELLED;
    booking.cancellation = {
      refundAmount: data.amount / 100, // Convert from kobo
      refundStatus: 'PROCESSED',
      refundedAt: new Date(),
    };
    await booking.save();
    await webhookMonitorService.logWebhookEvent(
      'PAYSTACK',
      'charge.refund',
      data,
      { success: true }
    );
  }

  // Helper functions for webhook event handling
  async handleChargeSuccess(chargeData) {
    const payment = await PaymentModel.findOne({
      transactionReference: chargeData.reference,
    }).populate('booking');

    if (!payment) {
      logger.warn('Payment not found for successful charge', {
        reference: chargeData.reference,
      });
      return;
    }
    // Update payment and booking status
    await this.bookingService.confirmBookingPayment(payment.booking._id);
    await webhookMonitorService.logWebhookEvent(
      'PAYSTACK',
      'charge.success',
      chargeData,
      { success: true }
    );
    // await this.bookingService.confirmBookingPayment(payment.booking._id);
  }

  async handleChargeFailed(chargeData) {
    const payment = await PaymentModel.findOne({
      transactionReference: chargeData.reference,
    }).populate('booking');

    if (!payment) {
      logger.warn('Payment not found for failed charge', {
        reference: chargeData.reference,
      });
      return;
    }

    await this.bookingService.handlePaymentFailure(payment.booking._id);
  }

  async handleRefundProcessed(refundData) {
    const payment = await PaymentModel.findOne({
      transactionReference: refundData.transaction_reference,
    }).populate('booking');

    if (!payment) {
      logger.warn('Payment not found for refund', {
        reference: refundData.transaction_reference,
      });
      return;
    }

    await this.bookingService.processRefund(payment.booking._id);
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
      console.log(reference);

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
        const payment = await PaymentModel.findOxne({
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
