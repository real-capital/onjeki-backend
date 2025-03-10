// // controllers/webhook.controller.js
// import crypto from 'crypto';
// import PaymentModel from '../../models/paymentModel.js';
// import BookingService from '../../services/booking/booking.service.js';
// import { logger } from '../../utils/logger.js';
// import PaystackService from '../../services/payment/payment.service.js';

// class WebhookController {
//   async webhook(req, res) {
//     try {
//       const paystackService = new PaystackService();
//       const bookingService = new BookingService();

//       // Verify webhook signature
//       const isValidWebhook = paystackService.verifyWebhookSignature(
//         req.body,
//         req.headers['x-paystack-signature']
//       );

//       if (!isValidWebhook) {
//         logger.warn('Invalid Paystack webhook', {
//           body: req.body,
//           headers: req.headers,
//         });
//         return res
//           .status(401)
//           .json({ status: 'error', message: 'Invalid webhook' });
//       }

//       const event = req.body;

//       // Handle different Paystack events
//       switch (event.event) {
//         case 'charge.success':
//           await this.handleChargeSuccess(event.data);
//           break;
//         case 'charge.failed':
//           await this.handleChargeFailed(event.data);
//           break;
//         case 'refund.processed':
//           await this.handleRefundProcessed(event.data);
//           break;
//         default:
//           logger.info('Unhandled Paystack event', { event: event.event });
//       }

//       res.status(200).json({ status: 'success' });
//     } catch (error) {
//       logger.error('Webhook processing error', error);
//       res
//         .status(500)
//         .json({ status: 'error', message: 'Webhook processing failed' });
//     }
//   }
//   async handlePaystackWebhook(req, res) {
//     try {
//       // Verify Paystack webhook signature
//       const hash = crypto
//         .createHmac(
//           'sha512',
//           process.env.PAYSTACK_SECRET_KEY ||
//             'pk_test_0c2d1bd85ce2cde55fa53c812303cffacee4fe75'
//         )
//         .update(JSON.stringify(req.body))
//         .digest('hex');

//       if (hash !== req.headers['x-paystack-signature']) {
//         return res
//           .status(401)
//           .json({ status: 'error', message: 'Invalid signature' });
//       }

//       const event = req.body;
//       const bookingService = new BookingService();

//       switch (event.event) {
//         case 'charge.success':
//           await this.handleSuccessfulCharge(event.data);
//           break;
//         case 'charge.failed':
//           await this.handleFailedCharge(event.data);
//           break;
//         case 'refund.processed':
//           await this.handleRefundProcessed(event.data);
//           break;
//         default:
//           console.log('Unhandled Paystack event:', event.event);
//       }

//       res.status(200).json({ status: 'success' });
//     } catch (error) {
//       console.error('Webhook error:', error);
//       res.status(500).json({ status: 'error', message: error.message });
//     }
//   }

//   async handleSuccessfulCharge(data) {
//     const payment = await PaymentModel.findOne({
//       transactionReference: data.reference,
//     }).populate('booking');

//     if (!payment) {
//       throw new Error('Payment not found');
//     }

//     // Update payment status
//     payment.status = 'PAID';
//     payment.paidAt = new Date();
//     payment.gatewayResponse = data;
//     await payment.save();

//     // Update booking status
//     const booking = payment.booking;
//     booking.status = BookingStatus.CONFIRMED;
//     booking.timeline.push({
//       status: 'PAYMENT_CONFIRMED',
//       message: 'Payment successfully completed',
//     });
//     await booking.save();

//     // Send confirmation notifications
//     const bookingService = new BookingService();
//     await bookingService.sendBookingNotifications(booking);
//   }

//   async handleFailedCharge(data) {
//     const payment = await PaymentModel.findOne({
//       transactionReference: data.reference,
//     }).populate('booking');

//     if (!payment) {
//       throw new Error('Payment not found');
//     }

//     // Update payment status
//     payment.status = 'FAILED';
//     payment.gatewayResponse = data;
//     await payment.save();

//     // Update booking status
//     const booking = payment.booking;
//     const bookingService = new BookingService();
//     await bookingService.handlePaymentFailure(booking._id, booking.guest);
//   }

//   async handleRefundProcessed(data) {
//     const payment = await PaymentModel.findOne({
//       transactionReference: data.transaction_reference,
//     }).populate('booking');

//     if (!payment) {
//       throw new Error('Payment not found');
//     }

//     // Update payment status
//     payment.status = 'REFUNDED';
//     payment.refundedAt = new Date();
//     payment.gatewayResponse = data;
//     await payment.save();

//     // Update booking status
//     const booking = payment.booking;
//     booking.status = BookingStatus.CANCELLED;
//     booking.cancellation = {
//       refundAmount: data.amount / 100, // Convert from kobo
//       refundStatus: 'PROCESSED',
//       refundedAt: new Date(),
//     };
//     await booking.save();
//   }

//   // Helper functions for webhook event handling
//   async handleChargeSuccess(chargeData) {
//     const payment = await PaymentModel.findOne({
//       transactionReference: chargeData.reference,
//     }).populate('booking');

//     if (!payment) {
//       logger.warn('Payment not found for successful charge', {
//         reference: chargeData.reference,
//       });
//       return;
//     }

//     const bookingService = new BookingService();
//     await bookingService.confirmBookingPayment(payment.booking._id);
//   }

//   async handleChargeFailed(chargeData) {
//     const payment = await PaymentModel.findOne({
//       transactionReference: chargeData.reference,
//     }).populate('booking');

//     if (!payment) {
//       logger.warn('Payment not found for failed charge', {
//         reference: chargeData.reference,
//       });
//       return;
//     }

//     const bookingService = new BookingService();
//     await bookingService.handlePaymentFailure(payment.booking._id);
//   }

//   async handleRefundProcessed(refundData) {
//     const payment = await PaymentModel.findOne({
//       transactionReference: refundData.transaction_reference,
//     }).populate('booking');

//     if (!payment) {
//       logger.warn('Payment not found for refund', {
//         reference: refundData.transaction_reference,
//       });
//       return;
//     }

//     const bookingService = new BookingService();
//     await bookingService.processRefund(payment.booking._id);
//   }
// }

// export default  WebhookController;
