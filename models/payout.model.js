// import mongoose from 'mongoose';

// const payoutSchema = new mongoose.Schema(
//   {
//     host: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     amount: {
//       type: Number,
//       required: true,
//     },
//     currency: {
//       type: String,
//       default: 'NGN',
//     },
//     status: {
//       type: String,
//       enum: ['processing', 'completed', 'failed'],
//       default: 'processing',
//     },
//     paymentMethod: {
//       type: String,
//       enum: ['bank_transfer', 'paystack'],
//       required: true,
//     },
//     bankDetails: {
//       accountName: String,
//       accountNumber: String,
//       bankCode: String,
//       bankName: String,
//     },
//     transactionReference: String,
//     earnings: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Earning',
//       },
//     ],
//     processingDate: Date,
//     completedDate: Date,
//     failureReason: String,
//     notes: String,
//   },
//   { timestamps: true }
// );

// const PayoutModel = mongoose.model('Payout', payoutSchema);

// export default PayoutModel;

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
      accountName: String,
      accountNumber: {
        type: String,
        validate: {
          validator: function (v) {
            // Nigerian bank account numbers are typically 10 digits
            return /^\d{10}$/.test(v);
          },
          message: (props) =>
            `${props.value} is not a valid Nigerian bank account number!`,
        },
      },
      bankCode: String,
      bankName: String,
      recipientCode: String, // Paystack transfer recipient code
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
payoutSchema.virtual('timeSinceRequest').get(function () {
  return Date.now() - this.requestedDate;
});

// Index for better query performance
payoutSchema.index({ host: 1, status: 1 });
payoutSchema.index({ createdAt: 1 });

const PayoutModel = mongoose.model('Payout', payoutSchema);

export default PayoutModel;
