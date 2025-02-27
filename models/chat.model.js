// chat.model.js
import mongoose, { Schema, model } from 'mongoose';
const chatSchema = new Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
    },
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      validate: {
        validator: function (participants) {
          return participants.length === 2; // Ensure exactly 2 participants
        },
        message: 'Chat must have exactly 2 participants',
      },
      required: true,
    },
    lastMessage: {
      content: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      createdAt: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived', 'blocked'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const ChatModel = mongoose.model('Chat', chatSchema);

export default ChatModel;
