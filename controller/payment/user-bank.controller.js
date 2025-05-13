// controller/payment/user-bank.controller.js
import BankAccountModel from '../../models/bank-account.model.js';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../utils/logger.js';
import HttpException from '../../utils/exception.js';
import BankService from '../../services/payment/bank.service.js';

class UserBankController {
  constructor() {
    this.bankService = new BankService();
  }

  /**
   * Save user bank account details
   */
  saveBankAccount = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { accountNumber, bankCode, bankName, accountName, isDefault = true } = req.body;
      
      // Validate input
      if (!accountNumber || !bankCode || !accountName) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Account number, bank code, and account name are required'
        );
      }
      
      // Verify bank account with Paystack
      const verification = await this.bankService.verifyBankAccount(accountNumber, bankCode);
      
      if (!verification.isVerified) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'Bank account verification failed: ' + verification.error
        );
      }
      
      // If setting as default, unset any existing default accounts
      if (isDefault) {
        await BankAccountModel.updateMany(
          { user: userId, isDefault: true },
          { isDefault: false }
        );
      }
      
      // Create transfer recipient (needed for payouts)
      const recipientCode = await this.bankService.createTransferRecipient(
        verification.accountName,
        accountNumber,
        bankCode
      );
      
      // Create or update bank account
      const bankAccount = await BankAccountModel.findOneAndUpdate(
        { user: userId, accountNumber, bankCode },
        {
          accountName: verification.accountName || accountName,
          bankName,
          recipientCode,
          isVerified: verification.isVerified,
          verifiedAt: new Date(),
          isDefault,
          isActive: true
        },
        { 
          new: true, 
          upsert: true
        }
      );
      
      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: bankAccount
      });
    } catch (error) {
      logger.error('Error saving bank account', { error, userId: req.user._id });
      next(error);
    }
  }

  /**
   * Get all user bank accounts
   */
  getBankAccounts = async (req, res, next) => {
    try {
      const userId = req.user._id;
      
      const bankAccounts = await BankAccountModel.find({ 
        user: userId,
        isActive: true
      }).sort({ isDefault: -1, createdAt: -1 });
      
      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: bankAccounts
      });
    } catch (error) {
      logger.error('Error getting bank accounts', { error, userId: req.user._id });
      next(error);
    }
  }

  /**
   * Set a bank account as default
   */
  setDefaultBankAccount = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { bankAccountId } = req.params;
      
      // Verify bank account belongs to user
      const bankAccount = await BankAccountModel.findOne({
        _id: bankAccountId,
        user: userId,
        isActive: true
      });
      
      if (!bankAccount) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Bank account not found'
        );
      }
      
      // Update all accounts to non-default
      await BankAccountModel.updateMany(
        { user: userId },
        { isDefault: false }
      );
      
      // Set this one as default
      bankAccount.isDefault = true;
      await bankAccount.save();
      
      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: bankAccount
      });
    } catch (error) {
      logger.error('Error setting default bank account', { 
        error, 
        userId: req.user._id,
        bankAccountId: req.params.bankAccountId
      });
      next(error);
    }
  }

  /**
   * Delete (deactivate) bank account
   */
  deleteBankAccount = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { bankAccountId } = req.params;
      
      // Verify bank account belongs to user
      const bankAccount = await BankAccountModel.findOne({
        _id: bankAccountId,
        user: userId
      });
      
      if (!bankAccount) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Bank account not found'
        );
      }
      
      // Don't physically delete - just mark as inactive
      bankAccount.isActive = false;
      
      // If this was the default account, set another one as default
      if (bankAccount.isDefault) {
        bankAccount.isDefault = false;
        await bankAccount.save();
        
        // Find another active account to set as default
        const anotherAccount = await BankAccountModel.findOne({
          user: userId,
          isActive: true,
          _id: { $ne: bankAccountId }
        });
        
        if (anotherAccount) {
          anotherAccount.isDefault = true;
          await anotherAccount.save();
        }
      } else {
        await bankAccount.save();
      }
      
      return res.status(StatusCodes.OK).json({
        status: 'success',
        message: 'Bank account deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting bank account', { 
        error, 
        userId: req.user._id,
        bankAccountId: req.params.bankAccountId
      });
      next(error);
    }
  }
}

export default UserBankController;