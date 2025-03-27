// jobs/subscriptionRenewalJob.js
import cron from 'node-cron';
import SubscriptionService from '../services/payment/subscription.service.js';

const subscriptionService = new SubscriptionService();
export default class SubscriptionRenewalJob {
  start() {
    // Run daily at midnight
    cron.schedule('0 0 * * *', async () => {
      try {
        await subscriptionService.processSubscriptionRenewals();
      } catch (error) {
        console.error('Subscription renewal job failed', error);
      }
    });
  }
}
