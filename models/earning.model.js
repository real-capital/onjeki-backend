import mongoose from 'mongoose';

const earningSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    serviceFee: {
      type: Number,
      required: true,
      min: 0,
    },
    netAmount: {
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
      enum: ['pending', 'available', 'paid', 'cancelled'],
      default: 'pending',
    },
    availableDate: {
      type: Date,
    },
    paidDate: Date,
    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payout',
    },
    paymentReference: String,
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'paystack', 'wallet'],
    },
    notes: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for calculating total earnings
earningSchema.virtual('total').get(function () {
  return this.amount - this.serviceFee;
});

// Index for efficient queries
earningSchema.index({ host: 1, status: 1 });
earningSchema.index({ createdAt: 1 });
earningSchema.index({ booking: 1 });

const EarningModel = mongoose.model('Earning', earningSchema);

export default EarningModel;
