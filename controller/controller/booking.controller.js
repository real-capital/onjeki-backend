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
import SubscriptionModel from '../../models/subscription.model.js';
import SubscriptionService from '../../services/payment/subscription.service.js';
import PayoutService from '../../services/payment/payout.service.js';
import EarningService from '../../services/payment/earning.service.js';

const paystackService = new PaystackService();
const webhookMonitorService = new WebhookMonitorService();
const subscriptionService = new SubscriptionService();
const payoutService = new PayoutService();

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
    // this.confirmBookingPayment = this.confirmBookingPayment.bind(this);
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
    this.handleSubscriptionRenewal = this.handleSubscriptionRenewal.bind(this);
    this.verifySubscriptionRenewal = this.verifySubscriptionRenewal.bind(this);
    // Add these to your binds in the constructor
    this.completeBooking = this.completeBooking.bind(this);
    this.guestCheckout = this.guestCheckout.bind(this);
    this.hostCompleteBooking = this.hostCompleteBooking.bind(this);
    this.getHostBookingsWithEarnings =
      this.getHostBookingsWithEarnings.bind(this);
    this.checkPayoutEligibility = this.checkPayoutEligibility.bind(this);
    this.callback = this.callback.bind(this);

    this.handleSubscriptionCreation =
      this.handleSubscriptionCreation.bind(this);
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
      // Verify webhook signature quickly
      const isValidWebhook = paystackService.verifyWebhookSignature(
        req.body,
        req.headers['x-paystack-signature']
      );

      if (!isValidWebhook) {
        return res
          .status(401)
          .json({ status: 'error', message: 'Invalid webhook' });
      }

      const event = req.body;

      // Log receipt of webhook without waiting for processing
      webhookMonitorService
        .logWebhookEvent('PAYSTACK', event.event, event.data, {
          status: 'received',
        })
        .catch((err) => logger.error('Failed to log webhook', { error: err }));

      // Respond to Paystack immediately
      res.status(200).json({ status: 'success' });

      // Process the webhook event asynchronously after responding
      setImmediate(() => {
        this.processWebhookEventAsync(event).catch((error) => {
          logger.error('Error processing webhook event', {
            error,
            eventType: event.event,
            data: event.data,
          });
        });
      });
    } catch (error) {
      logger.error('Error in webhook handler', { error });
      res
        .status(500)
        .json({ status: 'error', message: 'Webhook processing failed' });
    }
  }

  // New method to handle async processing after response is sent
  async processWebhookEventAsync(event) {
    try {
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
        case 'subscription.create':
          await this.handleSubscriptionCreation(event.data);
          break;
        case 'subscription.renewal':
          await this.handleSubscriptionRenewal(event.data);
          break;
        // Transfer (payout) related events
        case 'transfer.success':
        case 'transfer.failed':
        case 'transfer.reversed':
          await payoutService.handleTransferEvent(event);
          logger.info(`Handled transfer event: ${event.event}`, {
            reference: event.data.reference,
          });
          break;
        default:
          logger.info('Unhandled Paystack event', { event: event.event });
      }

      await webhookMonitorService.logWebhookEvent(
        'PAYSTACK',
        event.event,
        event.data,
        { status: 'processed', success: true }
      );
    } catch (error) {
      await webhookMonitorService.logWebhookEvent(
        'PAYSTACK',
        event.event,
        event.data,
        { status: 'failed', error: error.message }
      );
      throw error;
    }
  }
  // async webhook(req, res) {
  //   try {
  //     const paystackService = new PaystackService();

  //     // Verify webhook signature
  //     const isValidWebhook = paystackService.verifyWebhookSignature(
  //       req.body,
  //       req.headers['x-paystack-signature']
  //     );

  //     if (!isValidWebhook) {
  //       logger.warn('Invalid Paystack webhook', {
  //         body: req.body,
  //         headers: req.headers,
  //       });
  //       return res
  //         .status(401)
  //         .json({ status: 'error', message: 'Invalid webhook' });
  //     }

  //     const event = req.body;
  //     console.log(event.data);
  //     logger.info(event.data);

  //     // Enhanced event handling
  //     switch (event.event) {
  //       case 'charge.success':
  //         await this.handleChargeSuccess(event.data);
  //         break;
  //       case 'charge.failed':
  //         await this.handleChargeFailed(event.data);
  //         break;
  //       case 'refund.processed':
  //         await this.handleRefundProcessed(event.data);
  //         break;
  //       case 'subscription.create':
  //         await this.handleSubscriptionCreation(event.data);
  //         break;
  //       case 'subscription.renewal':
  //         await this.handleSubscriptionRenewal(event.data);
  //         break;
  //       // Transfer (payout) related events
  //       case 'transfer.success':
  //       case 'transfer.failed':
  //       case 'transfer.reversed':
  //         await payoutService.handleTransferEvent(event);
  //         logger.info(`Handled transfer event: ${event.event}`, {
  //           reference: event.data.reference,
  //         });
  //         break;
  //       default:
  //         logger.info('Unhandled Paystack event', { event: event.event });
  //     }

  //     res.status(200).json({ status: 'success' });
  //   } catch (error) {
  //     if (error.message.includes('transfer')) {
  //       logger.error('Error processing transfer webhook', {
  //         error,
  //         eventType: event.event,
  //         reference: event.data?.reference,
  //       });
  //     } else {
  //       logger.error('Error processing webhook', {
  //         error,
  //       });
  //       // Existing error handling
  //     }

  //     res
  //       .status(500)
  //       .json({ status: 'error', message: 'Webhook processing failed' });
  //   }
  // }

  // New method to handle subscription-related events
  async handleSubscriptionCreation(data) {
    try {
      // Check if this is a subscription-related transaction
      if (data.metadata && data.metadata.type === 'subscription_renewal') {
        await this.verifySubscriptionRenewal(data.reference);
      }
    } catch (error) {
      logger.error('Subscription creation webhook error', error);
    }
  }

  // New method to handle subscription renewal
  async handleSubscriptionRenewal(data) {
    try {
      // Verify the renewal transaction
      await this.verifySubscriptionRenewal(data.reference);
    } catch (error) {
      logger.error('Subscription renewal webhook error', error);
    }
  }

  // Method to verify subscription renewal
  async verifySubscriptionRenewal(reference) {
    try {
      // Verify Paystack transaction
      const verificationResult = await paystackService.verifyTransaction(
        reference
      );

      // Find subscription by renewal reference
      const subscription = await SubscriptionModel.findOne({
        $or: [
          { renewalTransactionReference: reference },
          { manualRenewalTransactionReference: reference },
        ],
      }).populate('user');

      if (!subscription) {
        logger.warn('Subscription not found for renewal', { reference });
        return;
      }

      // Check payment status
      if (verificationResult.status === 'success') {
        // Update subscription details
        subscription.status = 'active';
        subscription.currentPeriodStart = new Date();
        subscription.currentPeriodEnd = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
        );
        subscription.renewalTransactionReference = null;
        subscription.manualRenewalTransactionReference = null;

        await subscription.save();

        // Send renewal confirmation notification
        // await this.notificationService.send({
        //   userId: subscription.user._id,
        //   type: 'subscription_renewed',
        //   message: `Your ${subscription.plan} subscription has been successfully renewed.`,
        // });
      } else {
        // Update subscription status to failed
        subscription.status = 'renewal_failed';
        await subscription.save();

        // Send renewal failure notification
        // await this.notificationService.send({
        //   userId: subscription.user._id,
        //   type: 'subscription_renewal_failed',
        //   message: `Subscription renewal failed. Please manually renew to continue access.`,
        // });
      }
    } catch (error) {
      logger.error('Subscription renewal verification failed', error);
      throw error;
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
  async handleChargeFailed(chargeData) {
    try {
      const metadata = chargeData.metadata || {};

      if (metadata.type === 'subscription') {
        // Handle subscription payment failure
        const subscription = await SubscriptionModel.findOne({
          'paymentHistory.transactionReference': chargeData.reference,
        });

        if (subscription) {
          subscription.status = 'renewal_failed';
          await subscription.save();
        }
      } else {
        // Handle booking payment failure
        const payment = await PaymentModel.findOne({
          transactionReference: chargeData.reference,
        }).populate('booking');

        if (!payment) {
          this.logger.warn('Payment not found for failed charge', {
            reference: chargeData.reference,
          });
          return;
        }

        // Handle payment failure
        await this.bookingService.handlePaymentFailure(payment.booking._id);
      }

      // Log failed charge
      await webhookMonitorService.logWebhookEvent(
        'PAYSTACK',
        'charge.failed',
        chargeData,
        { success: true }
      );
    } catch (error) {
      this.logger.error('Error in handleChargeFailed', error);
      throw error;
    }
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
  async handleChargeSuccess(chargeData) {
    try {
      const metadata = chargeData.metadata || {};

      if (metadata.type === 'subscription') {
        await subscriptionService.verifyPayment(chargeData.reference);
        return;
      }

      const bookingId = metadata.bookingId;
      if (!bookingId) {
        logger.warn('No bookingId found in metadata', { chargeData });
        return;
      }

      // Optionally verify booking exists
      const booking = await BookingModel.findById(bookingId);
      if (!booking) {
        logger.warn('Booking not found for successful payment', { bookingId });
        return;
      }

      // Call confirmBookingPayment with your existing implementation
      await this.bookingService.confirmBookingPayment(bookingId);

      logger.info('Successfully processed payment for booking', {
        bookingId,
        reference: chargeData.reference,
      });
    } catch (error) {
      logger.error('Error in handleChargeSuccess', {
        error,
        reference: chargeData.reference,
        bookingId: chargeData.metadata?.bookingId,
      });
      throw error;
    }
  }

  // async handleChargeSuccess(chargeData) {
  //   try {
  //     const metadata = chargeData.metadata || {};

  //     if (metadata.type === 'subscription') {
  //       await subscriptionService.verifyPayment(chargeData.reference);
  //       return;
  //     }

  //     const bookingId = metadata.bookingId;

  //     if (!bookingId) {
  //       logger.warn('No bookingId found in metadata', { chargeData });
  //       return;
  //     }

  //     // Optionally, verify booking exists before updating
  //     const booking = await BookingModel.findById(bookingId);
  //     if (!booking) {
  //       logger.warn('Booking not found for successful payment', { bookingId });
  //       return;
  //     }

  //     await this.bookingService.confirmBookingPayment(bookingId);

  //     await webhookMonitorService.logWebhookEvent(
  //       'PAYSTACK',
  //       'charge.success',
  //       chargeData,
  //       { success: true }
  //     );
  //   } catch (error) {
  //     logger.error('Error in handleChargeSuccess', error);
  //     throw error;
  //   }
  // }

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

        // Check if this is a subscription-related transaction
        const subscription = await SubscriptionModel.findOne({
          $or: [
            { 'paymentHistory.transactionReference': reference },
            { renewalTransactionReference: reference },
            { manualRenewalTransactionReference: reference },
          ],
        });

        let redirectUrl;
        if (subscription) {
          // Subscription-related callback
          if (verificationResult.status === 'success') {
            // Update subscription
            subscription.status = 'active';
            subscription.currentPeriodStart = new Date();
            subscription.currentPeriodEnd = new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
            );
            subscription.renewalTransactionReference = null;
            subscription.manualRenewalTransactionReference = null;
            await subscription.save();

            redirectUrl = `onjeki://app/payment?reference=${reference}&status=success&type=subscription`;
          } else {
            subscription.status = 'renewal_failed';
            await subscription.save();

            redirectUrl = `onjeki://app/payment?reference=${reference}&status=failed&type=subscription`;
          }
        } else {
          // Find the associated booking payment
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

          // Existing booking payment logic
          if (verificationResult.status === 'success') {
            // Update payment and booking status
            // await this.bookingService.confirmBookingPayment(
            //   payment.booking._id
            // );
            redirectUrl = `onjeki://app/payment?reference=${reference}&status=success&type=booking`;
          } else {
            await this.bookingService.handlePaymentFailure(payment.booking._id);
            redirectUrl = `onjeki://app/payment?reference=${reference}&status=failed&type=booking`;
          }
        }

        res.redirect(redirectUrl);
      } catch (verificationError) {
        console.log(verificationError);
        logger.error('Payment verification failed', {
          reference,
          error: verificationError,
        });
        const errorRedirectUrl = `onjeki://app/payment?reference=${reference}&status=error`;
        res.redirect(errorRedirectUrl);
      }
    } catch (error) {
      logger.error('Paystack callback error', error);
      res.redirect('onjeki://app/payment?status=error');
    }
  }

  confirmBooking = async (req, res, next) => {
    try {
      const bookingId = req.params.id;
      await this.bookingService.confirmBookingPayment(bookingId);

      res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Booking confirmed successfully',
      });
    } catch (error) {
      next(error);
    }
  };
  getUserBookings = async (req, res, next) => {
    try {
      const bookings = await this.bookingService.getUserBookings(req.user._id);

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
  deleteBooking = async (req, res, next) => {
    try {
      const booking = await this.bookingService.deleteBooking(
        req.params.bookingId,
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

  /**
   * Complete a booking after checkout
   */
  completeBooking = async (req, res, next) => {
    try {
      const bookingId = req.params.id;
      const booking = await this.bookingService.completeBooking(bookingId);

      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: {
          booking,
          message: 'Booking completed successfully',
          completedAt: booking.checkOutDetails.checkOutTime,
        },
      });
    } catch (error) {
      logger.error('Error completing booking', {
        error,
        bookingId: req.params.id,
      });
      next(error);
    }
  };

  // controller/booking.controller.js
  guestCheckout = async (req, res, next) => {
    try {
      const bookingId = req.params.id;
      const userId = req.user._id;

      // Verify this is the guest's booking
      const booking = await BookingModel.findOne({
        _id: bookingId,
        guest: userId,
        status: BookingStatus.CONFIRMED,
      });

      if (!booking) {
        throw new HttpException(
          404,
          'Booking not found or cannot be checked out'
        );
      }

      // Complete the booking
      const completedBooking = await this.bookingService.completeBooking(
        bookingId
      );

      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: completedBooking,
      });
    } catch (error) {
      logger.error('Error in guest checkout', {
        error,
        bookingId: req.params.id,
      });
      next(error);
    }
  };
  // controller/booking.controller.js
  hostCompleteBooking = async (req, res, next) => {
    try {
      const bookingId = req.params.id;
      const hostId = req.user._id;

      // Verify this is the host's booking
      const booking = await BookingModel.findOne({
        _id: bookingId,
        host: hostId,
        status: BookingStatus.CONFIRMED,
      });

      if (!booking) {
        throw new HttpException(
          404,
          'Booking not found or cannot be completed'
        );
      }

      const today = new Date();
      if (new Date(booking.checkOut) > today) {
        throw new HttpException(
          400,
          'Cannot complete booking before checkout date'
        );
      }

      // Complete the booking
      const completedBooking = await this.bookingService.completeBooking(
        bookingId
      );

      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: completedBooking,
      });
    } catch (error) {
      logger.error('Error in host complete booking', {
        error,
        bookingId: req.params.id,
      });
      next(error);
    }
  };

  /**
   * Get host's booking history with earnings data
   */
  /**
   * @route GET /api/bookings/host/earnings
   * @desc Get host's booking history with earnings data
   * @access Private (Host only)
   */
  getHostBookingsWithEarnings = async (req, res, next) => {
    try {
      const hostId = req.user._id;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status,
      };

      const result = await this.bookingService.getHostBookingsWithEarnings(
        hostId,
        filters
      );

      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error getting host bookings with earnings', {
        error,
        userId: req.user._id,
      });
      next(error);
    }
  };

  /**
   * Check host payout eligibility
   */
  checkPayoutEligibility = async (req, res, next) => {
    try {
      const hostId = req.user._id;
      const result = await this.bookingService.checkHostPayoutEligibility(
        hostId
      );

      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error checking payout eligibility', {
        error,
        userId: req.user._id,
      });
      next(error);
    }
  };
}

export default BookingController;
