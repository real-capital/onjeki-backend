import EarningService from '../../services/payment/earning.service.js';

// controllers/earningController.js
const earningService = new EarningService();
class EarningController {
  //   constructor(earningService) {
  //     earningService = earningService;
  //   }

  // Get earnings summary
  async getEarningsSummary(req, res, next) {
    try {
      const hostId = req.user.id;
      const summary = await earningService.getEarningsSummary(hostId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

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
