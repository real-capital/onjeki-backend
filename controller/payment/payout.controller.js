// controller/payment/payout.controller.js
import { StatusCodes } from 'http-status-codes';
import PayoutService from '../../services/payment/payout.service.js';
import { logger } from '../../utils/logger.js';
import HttpException from '../../utils/exception.js';

class PayoutController {
  constructor() {
    this.payoutService = new PayoutService();
  }


  requestPayout = async (req, res, next) => {
    try {
      const hostId = req.user._id;
      const payoutData = {
        bankAccountId: req.body.bankAccountId, // Optional - for existing bank accounts
        paymentMethod: req.body.paymentMethod || 'bank_transfer',
        accountName: req.body.accountName,
        accountNumber: req.body.accountNumber,
        bankCode: req.body.bankCode,
        bankName: req.body.bankName,
      };

      // Validate input - either bankAccountId or account details must be provided
      if (
        !payoutData.bankAccountId &&
        (!payoutData.accountNumber ||
          !payoutData.bankCode ||
          !payoutData.accountName)
      ) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Either bankAccountId or complete bank account details are required'
        );
      }

      const payout = await this.payoutService.requestPayout(hostId, payoutData);

      return res.status(StatusCodes.CREATED).json({
        status: 'success',
        message: 'Payout request submitted successfully',
        data: payout,
      });
    } catch (error) {
      logger.error('Error requesting payout', {
        error: error.message,
        userId: req.user._id,
      });

      if (error.message.includes('No available earnings')) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          message: 'No available earnings to payout',
        });
      }

      if (error.message.includes('No valid bank account')) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          message: 'Please setup your bank account details first',
        });
      }

      next(error);
    }
  };

  /**
   * Get payout history
   */
  getPayoutHistory = async (req, res, next) => {
    try {
      const hostId = req.user._id;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status,
      };

      const payouts = await this.payoutService.getHostPayouts(hostId, filters);

      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: payouts,
      });
    } catch (error) {
      logger.error('Error getting payout history', {
        error,
        userId: req.user._id,
      });
      next(error);
    }
  };

  /**
   * Get payout details
   */
  getPayoutDetails = async (req, res, next) => {
    try {
      const hostId = req.user._id;
      const payoutId = req.params.payoutId;

      const payout = await this.payoutService.getPayoutById(payoutId, hostId);

      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: payout,
      });
    } catch (error) {
      logger.error('Error getting payout details', {
        error,
        userId: req.user._id,
        payoutId: req.params.payoutId,
      });
      next(error);
    }
  };

  /**
   * Check payout setup status
   */
  checkPayoutSetup = async (req, res, next) => {
    try {
      const hostId = req.user._id;
      const hasSetup = await this.payoutService.hasPayoutMethodSetup(hostId);

      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: { hasPayoutMethodSetup: hasSetup },
      });
    } catch (error) {
      logger.error('Error checking payout setup', {
        error,
        userId: req.user._id,
      });
      next(error);
    }
  };
}

export default PayoutController;
