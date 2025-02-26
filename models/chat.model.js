// chat.model.js
import mongoose, { Schema, model } from 'mongoose';
const chatSchema = new Schema(
  {
    inquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    messages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        content: String,
        attachments: [
          {
            type: String,
            url: String,
            name: String,
          },
        ],
        readBy: [
          {
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
            },
            readAt: Date,
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    lastMessage: {
      content: String,
      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      createdAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;
