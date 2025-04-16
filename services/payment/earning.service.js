import mongoose from 'mongoose';
import EarningModel from '../../models/earning.model.js';
import PayoutModel from '../../models/payout.model.js';
import { logger } from '../../utils/logger.js';
import PaystackService from './payment.service.js';

// services/earningService.js
const paystackService = new PaystackService();

class EarningService {
  // constructor(earningModel, payoutModel, paystackService, logger) {
  //   EarningModel = earningModel;
  //   PayoutModel = payoutModel;
  //   paystackService = paystackService;
  //   logger = logger;
  // }

  // Create earning record when booking is confirmed
  // Create earning record when booking is confirmed
  async createEarning(booking) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Calculate service fee (already in booking.pricing.serviceFee)
      const serviceFee = booking.pricing.serviceFee;

      // Calculate net amount (total - service fee)
      const netAmount = booking.pricing.total - serviceFee;

      // Create earning record
      const earning = new EarningModel({
        host: booking.host,
        property: booking.property,
        booking: booking._id,
        amount: booking.pricing.total,
        serviceFee: serviceFee,
        netAmount: netAmount,
        currency: booking.pricing.currency || 'NGN',
        status: 'pending',
        // Earnings become available 24 hours after checkout
        availableDate: new Date(
          new Date(booking.checkOut).getTime() + 24 * 60 * 60 * 1000
        ),
      });

      await earning.save({ session });

      // Commit transaction
      await session.commitTransaction();

      logger.info('Earning record created', {
        earningId: earning._id,
        bookingId: booking._id,
        hostId: booking.host,
      });

      return earning;
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();

      logger.error('Error creating earning record', {
        error,
        bookingId: booking._id,
        hostId: booking.host,
      });

      throw error;
    } finally {
      session.endSession();
    }
  }

  // Get host earnings summary
  async getEarningsSummary(hostId) {
    try {
      const pipeline = [
        { $match: { host: mongoose.Types.ObjectId(hostId) } },
        {
          $group: {
            _id: '$status',
            total: { $sum: '$netAmount' },
            count: { $sum: 1 },
          },
        },
      ];

      const earningsByStatus = await EarningModel.aggregate(pipeline);

      // Format results
      const summary = {
        pending: 0,
        available: 0,
        paid: 0,
        cancelled: 0,
        total: 0,
      };

      earningsByStatus.forEach((item) => {
        summary[item._id] = item.total;
        summary.total += item.total;
      });

      return summary;
    } catch (error) {
      logger.error('Error getting earnings summary', error);
      throw error;
    }
  }

  // Get earnings history with pagination
  async getEarningsHistory(hostId, filters = {}, page = 1, limit = 10) {
    try {
      const query = { host: hostId };

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.startDate && filters.endDate) {
        query.createdAt = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate),
        };
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get earnings with pagination
      const earnings = await EarningModel.find(query)
        .populate('property', 'title photo')
        .populate('booking', 'checkIn checkOut guestCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get total count for pagination
      const total = await EarningModel.countDocuments(query);

      return {
        earnings,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting earnings history', error);
      throw error;
    }
  }

  // Get earnings analytics
  async getEarningsAnalytics(hostId, period = 'monthly') {
    try {
      let groupBy;
      let dateFormat;

      // Set grouping based on period
      switch (period) {
        case 'weekly':
          groupBy = { $week: '$createdAt' };
          dateFormat = '%U';
          break;
        case 'monthly':
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          };
          dateFormat = '%Y-%m';
          break;
        case 'yearly':
          groupBy = { $year: '$createdAt' };
          dateFormat = '%Y';
          break;
        default:
          groupBy = {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          };
          dateFormat = '%Y-%m';
      }

      const pipeline = [
        {
          $match: {
            host: mongoose.Types.ObjectId(hostId),
            status: { $in: ['available', 'paid'] },
          },
        },
        {
          $group: {
            _id: groupBy,
            earnings: { $sum: '$netAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ];

      const analytics = await EarningModel.aggregate(pipeline);

      return {
        period,
        data: analytics,
      };
    } catch (error) {
      logger.error('Error getting earnings analytics', error);
      throw error;
    }
  }

  // Request payout
  async requestPayout(hostId, amount, paymentMethod, bankDetails) {
    try {
      // Check if host has enough available earnings
      const availableEarnings = await EarningModel.find({
        host: hostId,
        status: 'available',
      });

      const totalAvailable = availableEarnings.reduce(
        (sum, earning) => sum + earning.netAmount,
        0
      );

      if (totalAvailable < amount) {
        throw new Error('Insufficient available earnings');
      }

      // Create payout record
      const payout = new PayoutModel({
        host: hostId,
        amount,
        paymentMethod,
        bankDetails,
        status: 'processing',
        processingDate: new Date(),
        earnings: availableEarnings.map((earning) => earning._id),
      });

      // Process payout based on payment method
      if (paymentMethod === 'bank_transfer') {
        // Initiate bank transfer via Paystack
        const transfer = await paystackService.initiateTransfer({
          amount,
          recipient: bankDetails.recipientCode,
          reference: `payout_${payout._id}`,
        });

        payout.transactionReference = transfer.reference;
      }

      await payout.save();

      // Update earnings status
      await EarningModel.updateMany(
        { _id: { $in: availableEarnings.map((e) => e._id) } },
        { status: 'paid', paidDate: new Date() }
      );

      return payout;
    } catch (error) {
      logger.error('Error requesting payout', error);
      throw error;
    }
  }

  // Get payout history
  async getPayoutHistory(hostId, page = 1, limit = 10) {
    try {
      const query = { host: hostId };
      const skip = (page - 1) * limit;

      const payouts = await PayoutModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await PayoutModel.countDocuments(query);

      return {
        payouts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting payout history', error);
      throw error;
    }
  }

  // Process earnings to make them available after checkout + 24 hours
  async processAvailableEarnings() {
    try {
      // Find earnings that should become available
      const now = new Date();
      const pendingEarnings = await EarningModel.find({
        status: 'pending',
        availableDate: { $lte: now },
      });

      // Update status to available
      for (const earning of pendingEarnings) {
        earning.status = 'available';
        await earning.save();

        logger.info('Earning marked as available', {
          earningId: earning._id,
          bookingId: earning.booking,
          hostId: earning.host,
        });
      }

      return pendingEarnings.length;
    } catch (error) {
      logger.error('Error processing available earnings', error);
      throw error;
    }
  }
}

export default EarningService;
