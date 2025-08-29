// services/payout.service.js
import EarningModel from '../../models/earning.model.js';
import UserModel from '../../models/user.model.js';
import mongoose from 'mongoose';
import PayoutModel from '../../models/payout.model.js';
import PaystackService from './payment.service.js';
import { logger } from '../../utils/logger.js';
import BankAccountModel from '../../models/bank-account.model.js';

class PayoutService {
  constructor() {
    this.paystackService = new PaystackService();
  }

  /**
   * Request a payout for available earnings
   */

  async requestPayout(hostId, payoutData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find bank account details
      let bankAccount;

      if (payoutData.bankAccountId) {
        // If specific bank account ID is provided
        bankAccount = await BankAccountModel.findOne({
          _id: payoutData.bankAccountId,
          user: hostId,
          isActive: true,
          isVerified: true,
        }).session(session);
      } else {
        // Otherwise use default bank account
        bankAccount = await BankAccountModel.findOne({
          user: hostId,
          isDefault: true,
          isActive: true,
          isVerified: true,
        }).session(session);
      }

      // If no saved bank account found, create one from provided data
      if (!bankAccount && payoutData.accountNumber && payoutData.bankCode) {
        // Create recipient code first
        const recipientCode = await this.createTransferRecipient(
          payoutData.accountName,
          payoutData.accountNumber,
          payoutData.bankCode
        );

        // Create new bank account record
        bankAccount = new BankAccountModel({
          user: hostId,
          accountName: payoutData.accountName,
          accountNumber: payoutData.accountNumber,
          bankCode: payoutData.bankCode,
          bankName: payoutData.bankName,
          recipientCode: recipientCode,
          isDefault: true,
          isActive: true,
          isVerified: true,
        });

        await bankAccount.save({ session });
      }

      if (!bankAccount) {
        throw new Error('No valid bank account found for payout');
      }

      // Get available earnings
      const availableEarnings = await EarningModel.find({
        host: hostId,
        status: 'available',
      }).session(session);
      console.log('Available Earnings Debug:', {
        hostId,
        availableEarningsCount: availableEarnings.length,
        availableEarnings: availableEarnings.map((e) => ({
          id: e._id,
          amount: e.netAmount,
          status: e.status,
          availableDate: e.availableDate,
        })),
      });

      if (availableEarnings.length === 0) {
        throw new Error('No available earnings to payout');
      }

      // Calculate total payout amount
      const totalAmount = availableEarnings.reduce(
        (sum, earning) => sum + earning.netAmount,
        0
      );

      // Create payout record
      const payout = new PayoutModel({
        host: hostId,
        amount: totalAmount,
        currency: 'NGN',
        status: 'processing',
        paymentMethod: 'bank_transfer',
        bankDetails: {
          accountName: bankAccount.accountName,
          accountNumber: bankAccount.accountNumber,
          bankCode: bankAccount.bankCode,
          bankName: bankAccount.bankName,
          recipientCode: bankAccount.recipientCode,
        },
        earnings: availableEarnings.map((earning) => earning._id),
        processingDate: new Date(),
      });

      await payout.save({ session });

      // Update earnings status
      await EarningModel.updateMany(
        { _id: { $in: availableEarnings.map((e) => e._id) } },
        { status: 'pending', payoutId: payout._id },
        { session }
      );

      // Update bank account last used date
      bankAccount.lastUsed = new Date();
      await bankAccount.save({ session });

      // Initiate the transfer via Paystack
      if (bankAccount.recipientCode) {
        const transferResponse = await this.paystackService.initiateTransfer(
          bankAccount.recipientCode,
          totalAmount,
          `Payout to ${bankAccount.accountName}`
        );

        payout.transferCode = transferResponse.transferCode;
        payout.paystackReference = transferResponse.reference;
        await payout.save({ session });
      } else {
        throw new Error('Bank account not properly set up for transfers');
      }

      await session.commitTransaction();
      return payout;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error processing payout request', { error, hostId });
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Check if a user has setup their payout details
   */
  async hasPayoutMethodSetup(userId) {
    const defaultBankAccount = await BankAccountModel.findOne({
      user: userId,
      isDefault: true,
      isActive: true,
      isVerified: true,
    });

    return !!defaultBankAccount;
  }

  /**
   * Create a transfer recipient in Paystack
   * This is a placeholder implementation
   */

  async createTransferRecipient(name, accountNumber, bankCode) {
    try {
      const response = await this.paystackService.createTransferRecipient(
        name,
        accountNumber,
        bankCode
      );
      return response.recipient_code;
    } catch (error) {
      logger.error('Error creating transfer recipient', {
        error,
        accountNumber,
      });
      throw new Error('Failed to create transfer recipient');
    }
  }

  /**
   * Initiate a transfer via Paystack
   * This is a placeholder implementation
   */
  async initiateTransfer(recipientCode, amount, reason) {
    try {
      // In a real implementation, you would call the Paystack API
      // This is simulated for this example
      const response = await fetch(`${this.paystackBaseUrl}/transfer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: amount * 100, // convert to kobo
          recipient: recipientCode,
          reason,
        }),
      });

      const data = await response.json();
      return {
        transferCode: data.data.transfer_code,
        reference: data.data.reference,
      };
    } catch (error) {
      logger.error('Error initiating transfer', { error, recipientCode });
      throw new Error('Failed to initiate transfer');
    }
  }

  /**
   * Get host payout history
   */
  async getHostPayouts(hostId, filters = {}) {
    const query = { host: hostId };

    // Apply date filters
    if (filters.startDate) {
      query.createdAt = { $gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      query.createdAt = { ...query.createdAt, $lte: new Date(filters.endDate) };
    }

    // Apply status filter
    if (filters.status) {
      query.status = filters.status;
    }

    const payouts = await PayoutModel.find(query)
      .populate('earnings')
      .sort({ createdAt: -1 });

    return payouts;
  }

  /**
   * Get a single payout by ID
   */
  async getPayoutById(payoutId, hostId) {
    const payout = await PayoutModel.findOne({
      _id: payoutId,
      host: hostId,
    }).populate('earnings');

    if (!payout) {
      throw new Error('Payout not found');
    }

    return payout;
  }

  /**
   * Handle Paystack webhook for transfer events
   */
  async handleTransferEvent(event) {
    const reference = event.data.reference;

    // Find the associated payout
    const payout = await PayoutModel.findOne({
      paystackReference: reference,
    });

    if (!payout) {
      logger.warn('Payout not found for transfer event', { reference });
      return;
    }

    switch (event.event) {
      case 'transfer.success':
        await this.completeSuccessfulPayout(payout._id);
        break;

      case 'transfer.failed':
        await this.handleFailedPayout(payout._id, event.data.reason);
        break;

      case 'transfer.reversed':
        await this.handleReversedPayout(payout._id);
        break;

      default:
        logger.info('Unhandled transfer event', { event: event.event });
    }
  }

  /**
   * Complete a successful payout
   */
  async completeSuccessfulPayout(payoutId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payout = await PayoutModel.findById(payoutId).session(session);
      if (!payout) {
        throw new Error('Payout not found');
      }

      payout.status = 'completed';
      payout.completedDate = new Date();
      await payout.save({ session });

      // Update all associated earnings
      await EarningModel.updateMany(
        { _id: { $in: payout.earnings } },
        { status: 'paid' },
        { session }
      );

      await session.commitTransaction();

      // Send notification to host about successful payout
      // this.notificationService.sendPayoutNotification(payout);

      return payout;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error completing payout', { error, payoutId });
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Handle a failed payout
   */
  async handleFailedPayout(payoutId, reason) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payout = await PayoutModel.findById(payoutId).session(session);
      if (!payout) {
        throw new Error('Payout not found');
      }

      payout.status = 'failed';
      payout.failureReason = reason;
      await payout.save({ session });

      // Update earnings back to available
      await EarningModel.updateMany(
        { _id: { $in: payout.earnings } },
        { status: 'available', payoutId: null },
        { session }
      );

      await session.commitTransaction();

      // Send notification to host about failed payout
      // this.notificationService.sendPayoutFailureNotification(payout);

      return payout;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error handling failed payout', { error, payoutId });
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Handle a reversed payout
   */
  async handleReversedPayout(payoutId) {
    // Similar to failed payout handling
    return this.handleFailedPayout(payoutId, 'Payout was reversed');
  }

  /**
   * Check if a user has setup their payout details
   */
  async hasPayoutMethodSetup(userId) {
    const user = await UserModel.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Check if bank details are set up
    // This depends on your UserModel structure
    return !!(user.bankDetails && user.bankDetails.accountNumber);
  }
}

export default PayoutService;

