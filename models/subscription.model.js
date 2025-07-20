// import mongoose from 'mongoose';

// const subscriptionSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     plan: {
//       type: String,
//       enum: ['basic', 'premium', 'enterprise'],
//       default: 'basic',
//     },
//     status: {
//       type: String,
//       enum: [
//         'pending',
//         'active',
//         'trial',
//         'renewal_failed',
//         'expired',
//         'suspended',
//       ],
//       default: 'pending',
//     },
//     trialStartDate: Date,
//     trialEndDate: Date,
//     currentPeriodStart: Date,
//     currentPeriodEnd: Date,
//     renewalTransactionReference: String,
//     manualRenewalTransactionReference: String,
//     maxListings: {
//       type: Number,
//       default: 1,
//     },
//     paymentHistory: [
//       {
//         amount: Number,
//         date: Date,
//         status: {
//           type: String,
//           enum: ['success', 'failed', 'pending'],
//         },
//         transactionReference: String,
//       },
//     ],
//     retryCount: {
//       type: Number,
//       default: 0,
//     },
//   },
//   { timestamps: true }
// );

// const SubscriptionModel = mongoose.model('Subscription', subscriptionSchema);

// export default SubscriptionModel;


import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic',
    },
    status: {
      type: String,
      enum: [
        'pending',        // Waiting for payment
        'active',         // Currently active (includes basic plan)
        'trial',          // In trial period
        'renewal_failed', // Payment failed during renewal
        'expired',        // Subscription expired
        'suspended',      // Account suspended
        'cancelled',      // User cancelled
        'payment_failed', // Payment failed
      ],
      default: 'pending',
    },
    trialStartDate: Date,
    trialEndDate: Date,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    renewalTransactionReference: String,
    manualRenewalTransactionReference: String,
    maxListings: {
      type: Number,
      default: 1,
    },
    paymentHistory: [
      {
        amount: Number,
        date: Date,
        status: {
          type: String,
          enum: ['success', 'failed', 'pending'],
        },
        transactionReference: String,
        plan: String, // ✅ Add this field to store the plan for each payment
      },
    ],
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const SubscriptionModel = mongoose.model('Subscription', subscriptionSchema);

export default SubscriptionModel;