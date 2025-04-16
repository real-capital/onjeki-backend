import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'paystack'],
      required: true,
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      bankCode: String,
      bankName: String,
    },
    transactionReference: String,
    earnings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Earning',
      },
    ],
    processingDate: Date,
    completedDate: Date,
    failureReason: String,
    notes: String,
  },
  { timestamps: true }
);

const PayoutModel = mongoose.model('Payout', payoutSchema);

export default PayoutModel;
