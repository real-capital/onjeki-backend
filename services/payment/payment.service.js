// // services/payment.service.js
// import Stripe from 'stripe';
// import BookingModel from '../../models/booking.model.js';
// import HttpException from '../utils/exception.js';
// import { StatusCodes } from 'http-status-codes';
// import { BookingStatus } from '../../enum/booking.enum.js';
// // import PaystackService from './paystack.service.js';

// class PaymentService {
//   constructor() {
//     this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
//     this.paystack = new PaystackService(process.env.PAYSTACK_SECRET_KEY);
//   }

//   async createPaymentIntent(bookingId, userId) {
//     try {
//       const booking = await BookingModel.findOne({
//         _id: bookingId,
//         user: userId,
//       }).populate('property');

//       if (!booking) {
//         throw new HttpException(StatusCodes.NOT_FOUND, 'Booking not found');
//       }

//       const paymentIntent = await this.stripe.paymentIntents.create({
//         amount: Math.round(booking.totalPrice * 100), // Convert to cents
//         currency: 'ngn',
//         metadata: {
//           bookingId: booking._id.toString(),
//           propertyId: booking.property._id.toString(),
//           userId: userId.toString(),
//         },
//       });

//       return {
//         clientSecret: paymentIntent.client_secret,
//         amount: booking.totalPrice,
//       };
//     } catch (error) {
//       throw new HttpException(
//         StatusCodes.INTERNAL_SERVER_ERROR,
//         'Error creating payment'
//       );
//     }
//   }

//   async createPaymentIntent(amount, currency, metadata) {
//     try {
//       const paymentIntent = await this.stripe.paymentIntents.create({
//         amount,
//         currency,
//         metadata,
//       });
//       return paymentIntent;
//     } catch (error) {
//       console.error('Payment intent creation error:', error);
//       throw error;
//     }
//   }

//   async initiatePaystackPayment(email, amount) {
//     try {
//       const transaction = await this.paystack.initializeTransaction({
//         email,
//         amount: amount * 100, // Convert to kobo
//         currency: 'NGN',
//       });
//       return transaction;
//     } catch (error) {
//       console.error('Paystack payment error:', error);
//       throw error;
//     }
//   }

//   async handleWebhook(event) {
//     try {
//       switch (event.type) {
//         case 'payment_intent.succeeded':
//           await this.handleSuccessfulPayment(event.data.object);
//           break;
//         case 'payment_intent.payment_failed':
//           await this.handleFailedPayment(event.data.object);
//           break;
//       }
//     } catch (error) {
//       throw new HttpException(
//         StatusCodes.INTERNAL_SERVER_ERROR,
//         'Error processing webhook'
//       );
//     }
//   }

//   async handleSuccessfulPayment(paymentIntent) {
//     const booking = await BookingModel.findById(
//       paymentIntent.metadata.bookingId
//     );
//     if (booking) {
//       booking.status = BookingStatus.BOOKED;
//       booking.paymentStatus = 'paid';
//       await booking.save();
//     }
//   }

//   async handleFailedPayment(paymentIntent) {
//     const booking = await BookingModel.findById(
//       paymentIntent.metadata.bookingId
//     );
//     if (booking) {
//       booking.status = BookingStatus.CANCELED;
//       booking.paymentStatus = 'failed';
//       await booking.save();
//     }
//   }
// }

// export default new PaymentService();

// =================================



// import Stripe from 'stripe';
// import { createLogger } from '../utils/logger';
// import AppError from '../utils/appError';

// const logger = createLogger('PaymentService');
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// class PaymentService {
//   async createCustomer(user) {
//     try {
//       const customer = await stripe.customers.create({
//         email: user.email,
//         name: user.profile.name,
//         metadata: {
//           userId: user._id.toString()
//         }
//       });

//       return customer.id;
//     } catch (error) {
//       logger.error('Create customer failed:', error);
//       throw new AppError('Failed to create payment customer', 500);
//     }
//   }

//   async createPaymentIntent(booking) {
//     try {
//       const paymentIntent = await stripe.paymentIntents.create({
//         amount: Math.round(booking.pricing.total * 100), // Convert to cents
//         currency: booking.pricing.currency.toLowerCase(),
//         customer: booking.guest.stripeCustomerId,
//         metadata: {
//           bookingId: booking._id.toString(),
//           propertyId: booking.property.toString(),
//           guestId: booking.guest.toString()
//         },
//         automatic_payment_methods: {
//           enabled: true
//         }
//       });

//       return paymentIntent;
//     } catch (error) {
//       logger.error('Create payment intent failed:', error);
//       throw new AppError('Failed to create payment intent', 500);
//     }
//   }

//   async processRefund(bookingId, amount) {
//     try {
//       const booking = await Booking.findById(bookingId)
//         .populate('payment.transactionId');

//       const refund = await stripe.refunds.create({
//         payment_intent: booking.payment.transactionId,
//         amount: Math.round(amount * 100),
//         metadata: {
//           bookingId: booking._id.toString(),
//           reason: 'cancellation'
//         }
//       });

//       return refund;
//     } catch (error) {
//       logger.error('Process refund failed:', error);
//       throw new AppError('Failed to process refund', 500);
//     }
//   }

//   async createPayout(hostId, amount, currency) {
//     try {
//       const host = await User.findById(hostId);
      
//       const transfer = await stripe.transfers.create({
//         amount: Math.round(amount * 100),
//         currency: currency.toLowerCase(),
//         destination: host.stripeConnectId,
//         metadata: {
//           hostId: hostId.toString()
//         }
//       });

//       return transfer;
//     } catch (error) {
//       logger.error('Create payout failed:', error);
//       throw new AppError('Failed to create payout', 500);
//     }
//   }

//   // Webhook handler
//   async handleWebhook(event) {
//     try {
//       switch (event.type) {
//         case 'payment_intent.succeeded':
//           await this.handlePaymentSuccess(event.data.object);
//           break;
        
//         case 'payment_intent.payment_failed':
//           await this.handlePaymentFailure(event.data.object);
//           break;

//         case 'charge.refunded':
//           await this.handleRefundSuccess(event.data.object);
//           break;

//         // Add more webhook handlers as needed
//       }
//     } catch (error) {
//       logger.error('Webhook handling failed:', error);
//       throw error;
//     }
//   }
// }

// export default new PaymentService();