import mongoose, { model, Schema } from 'mongoose';

const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: [
      'NEW_BOOKING',
      'CHECK_IN',
      'CHECK_OUT',
      'REVIEW',
      'MESSAGE',
      'PAYMENT',
      'CANCELLATION',
      'SYSTEM_ALERT',
      'REFUND_PROCESSED',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  booking: {
    type: Schema.Types.ObjectId,
    ref: 'Booking',
  },
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
  },
  guest: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  data: Schema.Types.Mixed,
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const NotificationModel = model('Notification', notificationSchema);

export default NotificationModel;
