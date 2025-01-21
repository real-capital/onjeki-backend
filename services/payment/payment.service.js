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
