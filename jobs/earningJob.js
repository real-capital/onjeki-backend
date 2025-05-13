// utils/earningsCron.js
import cron from 'node-cron';
import EarningService from '../services/payment/earning.service.js';
import { completeExpiredBookings } from './processors/booking-completion.js';
import { logger } from '../utils/logger.js';

const earningService = new EarningService();

// class EarningsCron {
//   constructor() {
//     this.initializeCronJobs();
//   }

//   initializeCronJobs() {
//     // Run daily at midnight to process available earnings
//     cron.schedule('0 0 * * *', async () => {
//       try {
//         const processedCount = await earningService.processAvailableEarnings();
//         logger.info(`Processed ${processedCount} earnings to available status`);
//       } catch (error) {
//         logger.error('Earnings processing cron job failed:', error);
//       }
//     });

//     // Run at 3:00 AM every day
//     cron.schedule('0 3 * * *', async () => {
//       try {
//         logger.info('Running completeExpiredBookings job');
//         const result = await completeExpiredBookings();
//         logger.info('completeExpiredBookings job completed', result);
//       } catch (error) {
//         logger.error('completeExpiredBookings job failed', error);
//       }
//     });
//   }
// }

// export default new EarningsCron();



 export function scheduleEarningJobs() {
    // Run daily at midnight to process available earnings
    cron.schedule('0 0 * * *', async () => {
      try {
        const processedCount = await earningService.processAvailableEarnings();
        logger.info(`Processed ${processedCount} earnings to available status`);
      } catch (error) {
        logger.error('Earnings processing cron job failed:', error);
      }
    });

    // Run at 3:00 AM every day
    cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Running completeExpiredBookings job');
        const result = await completeExpiredBookings();
        logger.info('completeExpiredBookings job completed', result);
      } catch (error) {
        logger.error('completeExpiredBookings job failed', error);
      }
    });
  }
