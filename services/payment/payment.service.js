// services/payment/paystack.service.js
import axios from 'axios';
import crypto from 'crypto';

class PaystackService {
  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    this.baseUrl = 'https://api.paystack.co';
  }

  async initializeTransaction(transactionData) {
    try {
      console.log('Transaction Data:', transactionData);
      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          amount: Math.round(transactionData.amount * 100), // Convert to kobo
          email: transactionData.email,
          callback_url: process.env.FRONTEND_CALLBACK_URL,

          // channels: transactionData.channels,
          metadata: transactionData.metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        authorization_url: response.data.data.authorization_url,
        reference: response.data.data.reference,
      };
    } catch (error) {
      console.log('Paystack Error:', error.response?.data || error.message);
      throw new Error(
        `Paystack initialization failed: ${
          error.response?.data?.message || error.message
        }`
      );
      //   throw new Error(`Paystack initialization failed: ${error.message}`);
    }
  }

  async verifyTransaction(reference) {
    console.log(reference);
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        }
      );
      //   console.log(response);
      console.log({
        status: response.data.data.status,
        amount: response.data.data.amount / 100, // Convert back from kobo
        reference: response.data.data.reference,
        metadata: response.data.data.metadata,
      });

      return {
        status: response.data.data.status,
        amount: response.data.data.amount / 100, // Convert back from kobo
        reference: response.data.data.reference,
        metadata: response.data.data.metadata,
      };
    } catch (error) {
      console.log('Paystack Error:', error.response?.data || error.message);
      throw new Error(
        `Paystack verification failed: ${
          error.response?.data?.message || error
        }`
      );
    }
  }

  // async getCallback() {

  // }

  verifyWebhookSignature(body, signature) {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(body))
      .digest('hex');

    return hash === signature;
  }

  // Method to generate callback URL
  generateCallbackUrl(bookingId) {
    // Generate a unique callback URL for each booking
    return `${process.env.APP_URL}/booking/paystack/callback?bookingId=${bookingId}`;
  }

  async initiateRefund(refundData) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/refund`,
        {
          transaction: refundData.transactionReference,
          amount: refundData.amount, // in kobo
          reason: refundData.reason,
        },
        {
          headers: {
            Authorization: `Bearer ${this.paystackSecretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        status: response.data.status,
        reference: response.data.data.reference,
      };
    } catch (error) {
      throw new HttpException(
        500,
        'Failed to initiate refund',
        error.response?.data || error.message
      );
    }
  }
}

export default PaystackService;
