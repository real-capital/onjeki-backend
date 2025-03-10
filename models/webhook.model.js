import mongoose from 'mongoose';

// Webhook event schema
const webhookEventSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      required: true,
      enum: ['PAYSTACK', 'STRIPE', 'OTHER'],
    },
    eventType: {
      type: String,
      required: true,
    },
    rawPayload: mongoose.Schema.Types.Mixed,
    processedSuccessfully: {
      type: Boolean,
      default: false,
    },
    processingAttempts: {
      type: Number,
      default: 0,
    },
    processedAt: Date,
    errorDetails: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);

export default WebhookEvent;