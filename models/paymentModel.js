import mongoose, { Schema, model } from 'mongoose';

const paymentSchema = new Schema({
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'NGN',
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'PENDING',
  },
  paymentMethod: {
    type: String,
    enum: ['CARD', 'BANK_TRANSFER', 'BANK'],
  },
  transactionReference: String,
  paymentGateway: {
    type: String,
    enum: ['PAYSTACK'],
  },
  gatewayResponse: Schema.Types.Mixed,
  paidAt: Date,
  refundedAt: Date,
  metadata: Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

const PaymentModel = mongoose.model('Payment', paymentSchema);
export default PaymentModel;
