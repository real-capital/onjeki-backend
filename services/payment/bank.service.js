// services/bank.service.js
import axios from 'axios';
import { logger } from '../../utils/logger.js';

class BankService {
  constructor() {
    this.paystackSecretKey =
      process.env.PAYSTACK_SECRET_KEY ||
      'sk_test_61869c49111e0e75212e33e8bb481d94180f2d24';
    this.baseUrl = 'https://api.paystack.co';
    this.cache = {
      banks: null,
      lastFetched: null,
    };
  }

  /**
   * Get list of Nigerian banks from Paystack
   */
  async getNigerianBanks() {
    try {
      // Check cache first (valid for 24 hours)
      const cacheIsValid =
        this.cache.banks &&
        this.cache.lastFetched &&
        new Date() - this.cache.lastFetched < 24 * 60 * 60 * 1000;

      if (cacheIsValid) {
        return this.cache.banks;
      }

      const response = await axios.get(`${this.baseUrl}/bank`, {
        params: { country: 'nigeria', currency: 'NGN' },
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Cache the results
      this.cache.banks = response.data.data;
      this.cache.lastFetched = new Date();

      return response.data.data;
    } catch (error) {
      logger.error('Error fetching Nigerian banks', error);
      throw new Error('Failed to fetch bank list');
    }
  }

  /**
   * Verify a Nigerian bank account
   */
  async verifyBankAccount(accountNumber, bankCode) {
    try {
      const response = await axios.get(`${this.baseUrl}/bank/resolve`, {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
        headers: {
          Authorization: `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        accountName: response.data.data.account_name,
        accountNumber: response.data.data.account_number,
        bankCode: bankCode,
        isVerified: true,
      };
    } catch (error) {
      logger.error('Error verifying bank account', {
        error,
        accountNumber,
        bankCode,
      });

      // Return a structured error response
      return {
        isVerified: false,
        error: error.response?.data?.message || 'Unable to verify account',
      };
    }
  }
}

export default BankService;
