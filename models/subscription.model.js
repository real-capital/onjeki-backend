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
        'basic',
        'active',
        'trial',
        'renewal_failed',
        'expired',
        'suspended',
      ],
      default: 'basic',
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
