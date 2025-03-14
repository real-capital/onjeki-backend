import mongoose from 'mongoose';

// src/models/Conversation.js
const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
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

conversationSchema.index({ participants: 1 });
conversationSchema.index({ booking: 1 });
// conversationSchema.index({ 'unreadCounts.userId': 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
