import mongoose, { model, Schema } from 'mongoose';
import { BookingStatus } from '../enum/booking.enum'; // Assuming `BookingStatus` is an enum

const bookingSchema = new Schema({
  guest: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Property',
  },
  checkIn: {
    type: Date,
    required: true,
  },
  checkOut: {
    type: Date,
    required: true,
  },
  // duration: {
  //     type: Number,
  //     required: true
  // },
  // discount: {
  //     type: Number,
  //     required: true
  // },
  // status: {
  //     type: String,
  //     enum: Object.values(BookingStatus) // Assuming `BookingStatus` is an enum
  // },
  // totalPrice: {
  //     type: Number,
  //     required: true
  // },
  guests: {
    adults: { type: Number, required: true },
    children: { type: Number, default: 0 },
    infants: { type: Number, default: 0 },
  },
  payment: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    transactionId: String,
  },
  status: {
    type: String,
    enum: Object.values(BookingStatus),
    default: 'PENDING',
  },
  cancellation: {
    cancelledAt: Date,
    reason: String,
    cancelledBy: {
      type: Types.ObjectId,
      ref: 'User',
    },
    refundAmount: Number,
  },
});

const BookingModel = model('Booking', bookingSchema);

export default BookingModel;
