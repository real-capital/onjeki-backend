import mongoose from 'mongoose';
import EarningModel from '../../models/earning.model.js';
import PayoutModel from '../../models/payout.model.js';
import { logger } from '../../utils/logger.js';
import PaystackService from './payment.service.js';
import BookingModel from '../../models/booking.model.js';
import UserModel from '../../models/user.model.js';
import { BookingStatus } from '../../enum/booking.enum.js';

// services/earningService.js
const paystackService = new PaystackService();

class EarningService {
  constructor() {
    this.serviceFeePercentage = 0.05; // 5% service fee
  }

  /**
   * Create earning record when booking is confirmed
   */
  async createEarning(booking) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if earning already exists
      const existingEarning = await EarningModel.findOne({
        booking: booking._id,
      }).session(session);

      if (existingEarning) {
        logger.info('Earning record already exists', {
          earningId: existingEarning._id,
          bookingId: booking._id,
        });
        await session.commitTransaction();
        return existingEarning;
      }

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

  /**
   * Process booking earnings when a booking is completed
   * This will update the existing earning record, not create a new one
   */
  async processBookingEarnings(bookingId, existingSession = null) {
    let session = existingSession;
    let shouldCommit = false;

    // Only create a new session if one wasn't provided
    if (!session) {
      session = await mongoose.startSession();
      session.startTransaction();
      shouldCommit = true; // We'll need to commit if we created our own session
    }

    try {
      // Find the booking
      const booking = await BookingModel.findById(bookingId)
        .populate('property')
        .populate('host')
        .session(session);

      if (!booking) {
        throw new Error(`Booking not found: ${bookingId}`);
      }

      if (booking.status !== BookingStatus.COMPLETED) {
        throw new Error(`Booking is not completed: ${bookingId}`);
      }

      // Find the existing earning record
      const earning = await EarningModel.findOne({
        booking: bookingId,
      }).session(session);

      if (!earning) {
        // If no earning exists, create one (fallback, but shouldn't normally happen)
        logger.warn(
          `No earning record found for completed booking: ${bookingId}. Creating new record.`
        );

        const serviceFee =
          booking.pricing.serviceFee ||
          booking.pricing.total * this.serviceFeePercentage;
        const netAmount = booking.pricing.total - serviceFee;

        const newEarning = new EarningModel({
          host: booking.host._id,
          property: booking.property._id,
          booking: booking._id,
          amount: booking.pricing.total,
          serviceFee: serviceFee,
          netAmount: netAmount,
          currency: booking.pricing.currency || 'NGN',
          status: 'pending',
          availableDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        });

        await newEarning.save({ session });

        // Update host record
        await UserModel.findByIdAndUpdate(
          booking.host._id,
          { $inc: { 'hostProfile.totalEarnings': netAmount } },
          { session }
        );

        // Only commit if we created our own transaction
        if (shouldCommit) {
          await session.commitTransaction();
        }

        return newEarning;
      }

      // Ensure availableDate is set correctly (24 hours from now)
      earning.availableDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // If you want to ensure the status stays as pending, uncomment:
      // earning.status = 'pending';

      await earning.save({ session });

      // Update host record with earning information if not already done
      if (!booking.host.hostProfile?.totalEarnings) {
        await UserModel.findByIdAndUpdate(
          booking.host._id,
          { $inc: { 'hostProfile.totalEarnings': earning.netAmount } },
          { session }
        );
      }

      // Only commit if we created our own transaction
      if (shouldCommit) {
        await session.commitTransaction();
      }

      return earning;
    } catch (error) {
      // Only abort if we created our own transaction
      if (shouldCommit) {
        await session.abortTransaction();
      }
      logger.error('Error processing booking earnings', { error, bookingId });
      throw error;
    } finally {
      // Only end session if we created it
      if (shouldCommit) {
        session.endSession();
      }
    }
  }
  /**
   * Get host earnings with filtering options
   */
  /**
   * Get host earnings with filtering options
   */ /**
   * Get host earnings with filtering options
   */
  async getHostEarnings(hostId, filters = {}) {
    const query = { host: hostId };

    // Handle period parameter and convert to date range
    if (filters.period) {
      const now = new Date();
      let startDate;

      switch (filters.period) {
        case 'daily':
          // Just today
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'weekly':
          // Current week (starting from Monday)
          const dayOfWeek = now.getDay() || 7; // Convert Sunday (0) to 7
          startDate = new Date(now);
          startDate.setDate(now.getDate() - dayOfWeek + 1); // Get Monday
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          // Current month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'yearly':
          // Current year
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all':
          // No date filtering
          break;
        default:
          // Default to monthly if unrecognized
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Apply the date range filter if we have a start date
      if (startDate) {
        query.createdAt = { $gte: startDate };

        // If endDate was provided explicitly, we'll use it
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        } else {
          // Otherwise use current time as end date
          query.createdAt.$lte = now;
        }
      }
    } else {
      // Original code for explicit date filters
      if (filters.startDate) {
        query.createdAt = { $gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        query.createdAt = {
          ...query.createdAt,
          $lte: new Date(filters.endDate),
        };
      }
    }

    // Apply status filter
    if (filters.status) {
      query.status = filters.status;
    }

    const earnings = await EarningModel.find(query)
      .populate('property', 'title photo')
      .populate('booking', 'checkIn checkOut guests')
      .sort({ createdAt: -1 });

    // Calculate summary statistics
    // For consistency, pass the same period to get a relevant summary
    const summary = await this.getEarningsSummary(hostId, filters.period);

    return {
      earnings,
      summary,
    };
  }
  /**
   * Get a summary of host earnings
   */
  async getEarningsSummary(hostId, period = null) {
    // Base query for all aggregations
    const baseQuery = { host: new mongoose.Types.ObjectId(hostId) };

    // Apply period filtering if provided
    if (period) {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'daily':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'weekly':
          const dayOfWeek = now.getDay() || 7;
          startDate = new Date(now);
          startDate.setDate(now.getDate() - dayOfWeek + 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'all':
          // No date filtering for 'all'
          break;
        default:
          // Use default behavior (all time) if period is invalid
          break;
      }

      if (startDate) {
        baseQuery.createdAt = { $gte: startDate, $lte: now };
      }
    }

    // Create a separate query for total stats that doesn't filter by date
    const totalQuery = { host: new mongoose.Types.ObjectId(hostId) };

    // Create a query for monthly stats (always get current month stats)
    const monthlyQuery = {
      host: new mongoose.Types.ObjectId(hostId),
      createdAt: {
        $gte: new Date(new Date().setDate(1)), // First day of current month
      },
    };

    // Create a query for pending stats that should include period filter
    const pendingQuery = {
      ...baseQuery,
      status: 'pending',
    };
    const availableQuery = {
      ...baseQuery,
      status: 'available', // Make sure this matches your earning statuses
    };

    const [totalStats, monthlyStats, pendingStats, availableStats, paidStats] =
      await Promise.all([
        // Total earnings (all time or filtered by period)
        EarningModel.aggregate([
          { $match: period === 'all' ? totalQuery : baseQuery },
          {
            $group: {
              _id: null,
              totalEarnings: { $sum: '$amount' },
              totalServiceFees: { $sum: '$serviceFee' },
              totalNetAmount: { $sum: '$netAmount' },
              count: { $sum: 1 },
            },
          },
        ]),

        // Current month earnings (always show current month regardless of period)
        EarningModel.aggregate([
          { $match: monthlyQuery },
          {
            $group: {
              _id: null,
              monthlyEarnings: { $sum: '$amount' },
              monthlyServiceFees: { $sum: '$serviceFee' },
              monthlyNetAmount: { $sum: '$netAmount' },
              count: { $sum: 1 },
            },
          },
        ]),

        // Pending earnings (filtered by period if specified)
        EarningModel.aggregate([
          { $match: pendingQuery },
          {
            $group: {
              _id: null,
              pendingAmount: { $sum: '$netAmount' },
              count: { $sum: 1 },
            },
          },
        ]),
        EarningModel.aggregate([
          { $match: availableQuery },
          {
            $group: {
              _id: null,
              availableAmount: { $sum: '$netAmount' },
              count: { $sum: 1 },
            },
          },
        ]),

        EarningModel.aggregate([
          {
            $match: {
              ...baseQuery,
              status: { $in: ['paid', 'completed'] }, // Adjust status values as needed
            },
          },
          {
            $group: {
              _id: null,
              paidAmount: { $sum: '$netAmount' },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);
    const result = {
      total: totalStats[0] || {
        totalEarnings: 0,
        totalServiceFees: 0,
        totalNetAmount: 0,
        count: 0,
      },
      monthly: monthlyStats[0] || {
        monthlyEarnings: 0,
        monthlyServiceFees: 0,
        monthlyNetAmount: 0,
        count: 0,
      },
      pending: pendingStats[0] || { pendingAmount: 0, count: 0 },
      available: availableStats[0] || { availableAmount: 0, count: 0 }, // Add this
      paid: paidStats[0] || { paidAmount: 0, count: 0 },
      periodUsed: period || 'all',
    };

    // Add debugging
    console.log('Earnings Summary Debug:', {
      hostId,
      period,
      availableQuery,
      result,
    });

    return result;
  }
  /**
   * Update earnings to available status after hold period
   */
  async updateAvailableEarnings() {
    const now = new Date();

    const result = await EarningModel.updateMany(
      {
        status: 'pending',
        availableDate: { $lte: now },
      },
      {
        $set: { status: 'available' },
      }
    );

    logger.info(`Updated ${result.modifiedCount} earnings to available status`);
    return result.modifiedCount;
  }

  /**
   * Get earnings by ID
   */
  async getEarningById(earningId, hostId) {
    const earning = await EarningModel.findOne({
      _id: earningId,
      host: hostId,
    })
      .populate('property')
      .populate('booking');

    if (!earning) {
      throw new Error('Earning not found');
    }

    return earning;
  }

  /**
   * Helper method for pagination
   */
  getPaginationData(total, page, limit) {
    return {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get earnings history with pagination
   */
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
        pagination: this.getPaginationData(total, page, limit),
      };
    } catch (error) {
      logger.error('Error getting earnings history', error);
      throw error;
    }
  }

  /**
   * Get earnings analytics
   */
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
            host: new mongoose.Types.ObjectId(hostId),
            status: { $in: ['available', 'paid', ''] },
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

  /**
   * Request payout
   */
  async requestPayout(hostId, amount, paymentMethod, bankDetails) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if host has enough available earnings
      const availableEarnings = await EarningModel.find({
        host: hostId,
        status: 'available',
      }).session(session);

      const totalAvailable = availableEarnings.reduce(
        (sum, earning) => sum + earning.netAmount,
        0
      );

      if (totalAvailable < amount) {
        throw new Error(
          `Insufficient available earnings. Available: ${totalAvailable}, Requested: ${amount}`
        );
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

      await payout.save({ session });

      // Update earnings status
      await EarningModel.updateMany(
        { _id: { $in: availableEarnings.map((e) => e._id) } },
        { status: 'paid', paidDate: new Date() },
        { session }
      );

      await session.commitTransaction();
      return payout;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error requesting payout', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get payout history
   */
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
        pagination: this.getPaginationData(total, page, limit),
      };
    } catch (error) {
      logger.error('Error getting payout history', error);
      throw error;
    }
  }

  /**
   * Process earnings to make them available after checkout + 24 hours
   */
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
