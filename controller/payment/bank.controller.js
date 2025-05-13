// controller/payment/bank.controller.js
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../utils/logger.js';
import BankService from '../../services/payment/bank.service.js';

class BankController {
  constructor() {
    this.bankService = new BankService();
  }

  /**
   * Get list of Nigerian banks
   */
  getBanks = async (req, res, next) => {
    try {
      const banks = await this.bankService.getNigerianBanks();

      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: banks,
      });
    } catch (error) {
      logger.error('Error getting banks list', error);
      next(error);
    }
  };

  /**
   * Verify a bank account
   */
  verifyBankAccount = async (req, res, next) => {
    try {
      const { accountNumber, bankCode } = req.body;

      if (!accountNumber || !bankCode) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          message: 'Account number and bank code are required',
        });
      }

      const result = await this.bankService.verifyBankAccount(
        accountNumber,
        bankCode
      );

      if (result.isVerified) {
        return res.status(StatusCodes.OK).json({
          status: 'success',
          data: result,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          message: result.error,
        });
      }
    } catch (error) {
      logger.error('Error verifying bank account', error);
      next(error);
    }
  };
}

export default BankController;
