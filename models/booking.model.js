import mongoose, { model, Schema } from 'mongoose';
import { BookingStatus } from '../enum/booking.enum.js'; // Assuming `BookingStatus` is an enum
import Conversation from './conversation.model.js';

const bookingSchema = new Schema(
  {
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
    host: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },

    pricing: {
      nightlyRate: {
        type: Number,
        required: true,
      },
      nights: {
        type: Number,
        required: true,
      },
      cleaningFee: {
        type: Number,
        default: 0,
      },
      serviceFee: {
        type: Number,
        default: 0,
      },
      discount: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: 'NGN',
      },
    },

    guests: {
      adults: {
        type: Number,
        required: true,
        min: 1,
      },
      children: {
        type: Number,
        default: 0,
      },
      infants: {
        type: Number,
        default: 0,
      },
    },
    payment: {
      amount: { type: Number },
      currency: { type: String, default: 'NGN' },
      status: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
        default: 'PENDING',
      },
      method: String,
      transactionId: String,
      paidAt: Date,
      refundedAt: Date,
      // transactionId: String,
    },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
    },

    cancellation: {
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: String,
      cancelledAt: Date,
      refundAmount: Number,
      refundStatus: {
        type: String,
        enum: ['Pending', 'Processed', 'Failed'],
      },
    },
    specialRequests: String,
    checkInDetails: {
      estimatedArrivalTime: String,
      actualCheckInTime: Date,
      checkInNotes: String,
      checkInPhotos: [String],
      isCheckedIn: { type: Boolean, default: false },
    },

    checkOutDetails: {
      checkOutTime: Date,
      checkOutNotes: String,
      checkOutPhotos: [String],
      isCheckedOut: { type: Boolean, default: false },
    },

    review: {
      guest: {
        rating: Number,
        comment: String,
        createdAt: Date,
      },
      host: {
        rating: Number,
        comment: String,
        createdAt: Date,
      },
    },

    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    // checkInDetails: {
    //   estimatedArrivalTime: String,
    //   actualCheckInTime: Date,
    //   checkInNotes: String,
    // },
    // checkOutDetails: {
    //   checkOutTime: Date,
    //   checkOutNotes: String,
    // },
    // review: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Review',
    // },
    // conversation: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Conversation',
    // },
    hostActions: {
      isReviewed: { type: Boolean, default: false },
      acceptedAt: Date,
      rejectedAt: Date,
      rejectionReason: String,
    },

    guestActions: {
      isReviewed: { type: Boolean, default: false },
      checkedInAt: Date,
      checkedOutAt: Date,
    },

    notifications: [
      {
        type: String,
        message: String,
        createdAt: { type: Date, default: Date.now },
        isRead: { type: Boolean, default: false },
      },
    ],

    timeline: [
      {
        status: {
          type: String,
          enum: [
            'CREATED',
            'PENDING_HOST_APPROVAL',
            'PAYMENT_INITIATED',
            'PAYMENT_CONFIRMED',
            'ACCEPTED',
            'REJECTED',
            'CANCELLED',
            'CHECKED_IN',
            'CHECKED_OUT',
            'COMPLETED',
          ],
        },
        message: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

bookingSchema.index({ property: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guest: 1, status: 1 });
bookingSchema.index({ host: 1, status: 1 });

// Middleware
bookingSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Create conversation for booking
    const conversation = await Conversation.create({
      booking: this._id,
      participants: [this.guest, this.host],
    });
    this.conversation = conversation._id;
  }
  next();
});

// Methods
bookingSchema.methods = {
  async acceptByHost() {
    this.status = BookingStatus.CONFIRMED;
    this.hostActions.acceptedAt = new Date();
    this.timeline.push({
      status: 'ACCEPTED',
      message: 'Booking accepted by host',
    });

    // Create or update calendar availability
    await this.updateCalendarAvailability();

    // Send notification to guest
    await this.notifyGuest('booking_accepted');

    return this.save();
  },
  async rejectByHost(reason) {
    this.status = BookingStatus.REJECTED;
    this.hostActions.rejectedAt = new Date();
    this.hostActions.rejectionReason = reason;
    this.timeline.push({
      status: 'REJECTED',
      message: `Booking rejected by host: ${reason}`,
    });

    // Process refund if payment was made
    if (this.payment.status === 'PAID') {
      await this.processRefund();
    }

    // Send notification to guest
    await this.notifyGuest('booking_rejected');

    return this.save();
  },
  async checkInUser(details) {
    this.checkInDetails = {
      ...this.checkInDetails,
      ...details,
      actualCheckInTime: new Date(),
      isCheckedIn: true,
    };

    this.timeline.push({
      status: 'CHECKED_IN',
      message: 'Guest checked in',
    });

    await this.save();
    await this.notifyHost('guest_checked_in');
  },

  async checkOutUser(details) {
    this.checkOutDetails = {
      ...this.checkOutDetails,
      ...details,
      checkOutTime: new Date(),
      isCheckedOut: true,
    };

    this.status = BookingStatus.COMPLETED;
    this.timeline.push({
      status: 'CHECKED_OUT',
      message: 'Guest checked out',
    });

    await this.save();
    await this.notifyHost('guest_checked_out');
  },
  async cancel(userId, reason) {
    const now = new Date();

    // Calculate refund amount based on cancellation policy
    const property = await mongoose.model('Property').findById(this.property);
    const refundAmount = await this.calculateRefundAmount(
      property.rules.cancellationPolicy
    );

    this.status = 'Cancelled';
    this.cancellation = {
      cancelledBy: userId,
      reason,
      cancelledAt: now,
      refundAmount,
      refundStatus: 'Pending',
    };

    if (refundAmount > 0) {
      // Process refund through payment service
      const refund = await paymentService.processRefund(
        this.payment.transactionId,
        refundAmount
      );

      if (refund.success) {
        this.cancellation.refundStatus = 'Processed';
        this.payment.status = 'Refunded';
        this.payment.refundedAt = now;
      } else {
        this.cancellation.refundStatus = 'Failed';
      }
    }

    await this.save();
    return this;
  },

  calculateRefundAmount(cancellationPolicy) {
    const now = new Date();
    const checkIn = new Date(this.checkIn);
    const daysUntilCheckIn = Math.ceil((checkIn - now) / (1000 * 60 * 60 * 24));

    let refundPercentage = 0;
    switch (cancellationPolicy) {
      case 'flexible':
        refundPercentage = daysUntilCheckIn >= 1 ? 100 : 0;
        break;
      case 'moderate':
        refundPercentage = daysUntilCheckIn >= 5 ? 100 : 50;
        break;
      case 'strict':
        refundPercentage =
          daysUntilCheckIn >= 14 ? 100 : daysUntilCheckIn >= 7 ? 50 : 0;
        break;
    }

    return (this.pricing.total * refundPercentage) / 100;
  },
};

const BookingModel = model('Booking', bookingSchema);

export default BookingModel;
