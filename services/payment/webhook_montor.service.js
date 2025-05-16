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
