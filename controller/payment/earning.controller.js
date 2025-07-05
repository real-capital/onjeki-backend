import { StatusCodes } from 'http-status-codes';
import EarningService from '../../services/payment/earning.service.js';
import { logger } from '../../utils/logger.js';

// controllers/earningController.js
const earningService = new EarningService();
class EarningController {

  getHostEarnings = async (req, res, next) => {
    try {
      const hostId = req.user.id;
      const { period, status, startDate, endDate } = req.query;

      const filters = {
        period,
        status,
        startDate,
        endDate,
      };

      const result = await earningService.getHostEarnings(hostId, filters);

      return res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      logger.error('Error getting host earnings', {
        error,
        userId: req.user._id,
      });
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to get earnings',
      });
    }
  };

  /**
   * Get earning summary
   */
  getEarningsSummary = async (req, res, next) => {
    try {
      const hostId = req.user._id;
      const summary = await earningService.getEarningsSummary(hostId);

      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      logger.error('Error getting earnings summary', {
        error,
        userId: req.user._id,
      });
      next(error);
    }
  };

  /**
   * Get single earning details
   */
  getEarningDetails = async (req, res, next) => {
    try {
      const hostId = req.user._id;
      const earningId = req.params.earningId;

      const earning = await earningService.getEarningById(earningId, hostId);

      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: earning,
      });
    } catch (error) {
      logger.error('Error getting earning details', {
        error,
        userId: req.user._id,
        earningId: req.params.earningId,
      });
      next(error);
    }
  };

  // Get earnings history
  async getEarningsHistory(req, res, next) {
    try {
      const hostId = req.user.id;
      const { page = 1, limit = 10, status, startDate, endDate } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (startDate && endDate) {
        filters.startDate = startDate;
        filters.endDate = endDate;
      }

      const result = await earningService.getEarningsHistory(
        hostId,
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: result.earnings,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get earnings analytics
  async getEarningsAnalytics(req, res, next) {
    try {
      const hostId = req.user.id;
      const { period = 'monthly' } = req.query;

      const analytics = await earningService.getEarningsAnalytics(
        hostId,
        period
      );

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  // Request payout
  async requestPayout(req, res, next) {
    try {
      const hostId = req.user.id;
      const { amount, paymentMethod, bankDetails } = req.body;

      const payout = await earningService.requestPayout(
        hostId,
        amount,
        paymentMethod,
        bankDetails
      );

      res.status(200).json({
        success: true,
        data: payout,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get payout history
  async getPayoutHistory(req, res, next) {
    try {
      const hostId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const result = await earningService.getPayoutHistory(
        hostId,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: result.payouts,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default EarningController;
