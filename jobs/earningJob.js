// utils/earningsCron.js
import cron from 'node-cron';
import EarningService from '../services/payment/earning.service.js';

const earningService = new EarningService();

class EarningsCron {
  constructor() {
    this.initializeCronJobs();
  }

  initializeCronJobs() {
    // Run daily at midnight to process available earnings
    cron.schedule('0 0 * * *', async () => {
      try {
        const processedCount =
          await earningService.processAvailableEarnings();
        logger.info(`Processed ${processedCount} earnings to available status`);
      } catch (error) {
        logger.error('Earnings processing cron job failed:', error);
      }
    });
  }
}

export default new EarningsCron();
