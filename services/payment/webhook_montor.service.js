import WebhookEvent from '../../models/webhook.model.js';

class WebhookMonitorService {
  async findRecentEvent(service, eventType, reference, lookbackMs = 300000) {
    return await WebhookEvent.findOne({
      service,
      eventType,
      'rawPayload.reference': reference,
      createdAt: { $gte: new Date(Date.now() - lookbackMs) },
    }).sort({ createdAt: -1 });
  }

  async logWebhookEvent(service, eventType, payload, processingResult = {}) {
    try {
      const webhookEvent = new WebhookEvent({
        service,
        eventType,
        rawPayload: payload,
        processedSuccessfully: processingResult.success || false,
        processingAttempts: processingResult.attempts || 0,
        processedAt: new Date(),
        errorDetails: processingResult.error,
      });

      await webhookEvent.save();

      return webhookEvent;
    } catch (error) {
      logger.error('Failed to log webhook event', error);
    }
  }
  // async logWebhookEvent(service, eventType, rawPayload, options = {}) {
  //   const event = new WebhookEventModel({
  //     service,
  //     eventType,
  //     rawPayload,
  //     processedSuccessfully: options.processedSuccessfully || false,
  //     processingAttempts: 0,
  //     processedAt: options.status === 'processed' ? new Date() : null,
  //     status: options.status || 'received',
  //     errorDetails: options.error || null,
  //   });

  //   return await event.save();
  // }

  async updateWebhookEvent(eventId, options = {}) {
    const update = {};

    if (options.status) update.status = options.status;
    if (options.error) update.errorDetails = options.error;
    if (options.hasOwnProperty('processedSuccessfully'))
      update.processedSuccessfully = options.processedSuccessfully;

    return await WebhookEvent.findByIdAndUpdate(
      eventId,
      { ...update, processedAt: new Date() },
      { new: true }
    );
  }

  async getRecentWebhookEvents(service, days = 7) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - days);

    return WebhookEvent.find({
      service,
      createdAt: { $gte: sevenDaysAgo },
    }).sort({ createdAt: -1 });
  }

  async getFailedWebhookEvents() {
    return WebhookEvent.find({
      processedSuccessfully: false,
      processingAttempts: { $lt: 3 },
    });
  }
}

export default WebhookMonitorService;
