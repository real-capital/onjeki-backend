// inquiry.model.js
import mongoose, { Schema, model } from 'mongoose';
const inquirySchema = new Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'CLOSED'],
      default: 'PENDING',
    },
    type: {
      type: String,
      enum: ['VIEWING_REQUEST', 'INFORMATION_REQUEST', 'OFFER'],
      required: true,
    },
    message: String,
    // For offers
    offer: {
      amount: Number,
      currency: String,
      validUntil: Date,
    },
    // For viewing requests
    viewingTime: {
      preferredDate: Date,
      preferredTime: String,
    },
    responses: [
      {
        from: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        message: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Inquiry = mongoose.model('Inquiry', inquirySchema);

export default Inquiry;
