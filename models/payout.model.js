import mongoose from 'mongoose';

// Updated payout schema
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
      min: 0,
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'paystack'],
      required: true,
    },
    bankDetails: {
      accountName: {
        type: String,
        required: true,
      },
      accountNumber: {
        type: String,
        required: true,
        validate: {
          validator: function (v) {
            return /^\d{10}$/.test(v);
          },
          message: 'Invalid Nigerian bank account number format',
        },
      },
      bankCode: {
        type: String,
        required: true,
      },
      bankName: String,
      recipientCode: String,
    },
    transactionReference: String,
    paystackReference: String, // Paystack reference
    transferCode: String, // Paystack transfer code
    earnings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Earning',
      },
    ],
    requestedDate: {
      type: Date,
      default: Date.now,
    },
    processingDate: Date,
    completedDate: Date,
    failureReason: String,
    notes: String,
    attempts: {
      type: Number,
      default: 0,
      max: 3,
    },
    lastAttemptDate: Date,
    sessionId: String,
    metaData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add virtual for time since request
// payoutSchema.virtual('timeSinceRequest').get(function () {
//   return Date.now() - this.requestedDate;
// });

// Index for better query performance
payoutSchema.index({ host: 1, status: 1 });
payoutSchema.index({ createdAt: 1 });
payoutSchema.index({ paystackReference: 1 });

const PayoutModel = mongoose.model('Payout', payoutSchema);

export default PayoutModel;
