// jobs/email-jobs.js
import cron from 'node-cron';
import emailService from '../services/email/otpMail.service.js';
import UserModel from '../models/user.model.js';
import EarningModel from '../models/earning.model.js';
import { logger } from '../utils/logger.js';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import EarningService from '../services/payment/earning.service.js';

// Initialize services
const earningService = new EarningService();

/**
 * Send email notifications for newly available earnings
 */
export async function sendAvailableEarningsNotifications() {
  try {
    // Find all earnings that became available in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Find earnings grouped by host
    const hosts = await EarningModel.aggregate([
      {
        $match: {
          status: 'available',
          // Only include earnings that were updated to 'available' in the last hour
          updatedAt: { $gte: oneHourAgo },
        },
      },
      {
        $group: {
          _id: '$host',
          earnings: { $push: '$$ROOT' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Send emails to each host
    for (const host of hosts) {
      await emailService.sendEarningsAvailableEmail(host._id, host.earnings);
      logger.info(`Sent available earnings notification to host ${host._id}`);
    }

    return {
      success: true,
      hostsNotified: hosts.length,
      totalEarnings: hosts.reduce((sum, host) => sum + host.count, 0),
    };
  } catch (error) {
    logger.error('Error sending available earnings notifications', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send monthly earnings summary emails to all hosts
 */
export async function sendMonthlyEarningsSummaries() {
  try {
    // Get last month's date range
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const startDate = startOfMonth(lastMonth);
    const endDate = endOfMonth(lastMonth);
    const month = lastMonth.getMonth() + 1; // 1-12
    const year = lastMonth.getFullYear();

    // Find all hosts who had bookings in the date range
    const hosts = await UserModel.find({
      'hostProfile.joinedAt': { $exists: true },
    });

    let sentCount = 0;

    // Process each host
    for (const host of hosts) {
      try {
        // Get host earnings summary for the month
        const summary = await earningService.getMonthlyEarningsSummary(
          host._id,
          startDate,
          endDate
        );

        // Only send emails to hosts who had earnings activity
        if (
          summary &&
          (summary.totalBookings > 0 || summary.totalEarnings > 0)
        ) {
          await emailService.sendMonthlyEarningsSummary(
            host._id,
            month,
            year,
            summary
          );
          sentCount++;
        }
      } catch (hostError) {
        logger.error(
          `Error processing monthly summary for host ${host._id}`,
          hostError
        );
        // Continue with next host
      }
    }

    logger.info(
      `Sent ${sentCount} monthly earnings summaries for ${format(
        lastMonth,
        'MMMM yyyy'
      )}`
    );
    return { success: true, sentCount };
  } catch (error) {
    logger.error('Error sending monthly earnings summaries', error);
    return { success: false, error: error.message };
  }
}

// Schedule cron jobs
export function scheduleEmailJobs() {
  // Send available earnings notifications every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Running job: sendAvailableEarningsNotifications');
    await sendAvailableEarningsNotifications();
  });

  // Send monthly earnings summaries on the 1st of each month at 8:00 AM
  cron.schedule('0 8 1 * *', async () => {
    logger.info('Running job: sendMonthlyEarningsSummaries');
    await sendMonthlyEarningsSummaries();
  });

  logger.info('Email jobs scheduled successfully');
}
