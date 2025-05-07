// models/rentSalesMessage.model.js
import mongoose from 'mongoose';

const rentSalesMessageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RentSalesConversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    attachments: [
      {
        type: {
          type: String,
          enum: ['image', 'video', 'document', 'audio'],
        },
        url: String,
        name: String,
        size: Number,
        mimeType: String,
      },
    ],
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    status: {
      type: String,
      enum: ['SENT', 'DELIVERED', 'READ'],
      default: 'SENT',
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

rentSalesMessageSchema.index({ conversation: 1, createdAt: -1 });
rentSalesMessageSchema.index({ sender: 1, createdAt: -1 });

const RentSalesMessage = mongoose.model(
  'RentSalesMessage',
  rentSalesMessageSchema
);

export default RentSalesMessage;
