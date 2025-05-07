// models/rentSalesConversation.model.js
import mongoose from 'mongoose';

const rentSalesConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentAndSales',
      required: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentSalesMessage',
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

rentSalesConversationSchema.index({ participants: 1 });
rentSalesConversationSchema.index({ property: 1 });

const RentSalesConversation = mongoose.model(
  'RentSalesConversation',
  rentSalesConversationSchema
);

export default RentSalesConversation;
