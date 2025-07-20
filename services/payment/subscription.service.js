// services/subscriptionService.js
import paystack from 'paystack';
import UserModel from '../../models/user.model.js';
import SubscriptionModel from '../../models/subscription.model.js';
import PropertyModel from '../../models/properties.model.js';
import PaystackService from './payment.service.js';
import { logger } from '../../utils/logger.js';

const paystackService = new PaystackService();

class SubscriptionService {
  constructor() {
    this.paystackClient = paystack(process.env.PAYSTACK_SECRET_KEY);
  }

  // Plan Pricing and Limits
  getPlanDetails() {
    return {
      basic: {
        price: 0,
        maxListings: 1,
      },
      premium: {
        price: 3000,
        maxListings: 1000,
        trialDays: 30,
      },
      enterprise: {
        price: 10000,
        maxListings: 1000000,
      },
    };
  }

  // Plan Pricing
  getPlanPrice(plan) {
    switch (plan) {
      case 'premium':
        return 3000;
      case 'enterprise':
        return 10000;
      default:
        return 0;
    }
  }

  // Get Max Listings
  getMaxListings(plan) {
    switch (plan) {
      case 'basic':
        return 1;
      case 'premium':
        return 1000;
      case 'enterprise':
        return 1000000;
      default:
        return 1;
    }
  }

  // Initialize Subscription
  async initializeSubscription(userId, plan) {
    try {
      const planDetails = this.getPlanDetails()[plan];
      if (!planDetails) {
        throw new Error('Invalid subscription plan');
      }

      // Find or create subscription
      let subscription = await SubscriptionModel.findOne({ user: userId });

      if (!subscription) {
        subscription = new SubscriptionModel({
          user: userId,
          plan,
          status: plan === 'basic' ? 'active' : (plan === 'premium' ? 'trial' : 'pending'),
          maxListings: planDetails.maxListings,
        });

        // Set trial period for premium
        if (plan === 'premium') {
          subscription.trialStartDate = new Date();
          subscription.trialEndDate = new Date(
            Date.now() + planDetails.trialDays * 24 * 60 * 60 * 1000
          );
        }

        await subscription.save();
      } else {
        // Update existing subscription
        subscription.plan = plan;
        subscription.maxListings = planDetails.maxListings;
        
        // Update status based on plan
        if (plan === 'basic') {
          subscription.status = 'active';
        } else if (plan === 'premium') {
          subscription.status = 'trial';
          subscription.trialStartDate = new Date();
          subscription.trialEndDate = new Date(
            Date.now() + planDetails.trialDays * 24 * 60 * 60 * 1000
          );
        } else {
          subscription.status = 'pending';
        }
        
        await subscription.save();
      }

      return subscription;
    } catch (error) {
      logger.error('Failed to initialize subscription', error);
      throw error;
    }
  }

  // Initiate Payment (the missing method)
  async initiatePayment(userId, plan) {
    return await this.initiateSubscriptionPayment(userId, plan);
  }

  // Initiate Subscription Payment
  async initiateSubscriptionPayment(userId, plan) {
    const planDetails = this.getPlanDetails()[plan];
    if (!planDetails) {
      throw new Error('Invalid subscription plan');
    }

    try {
      // Find user
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get plan pricing
      const planPrices = {
        premium: 3000,
        enterprise: 10000,
      };

      if (!planPrices[plan]) {
        throw new Error('Invalid subscription plan');
      }

      // Find or create subscription record
      let subscription = await SubscriptionModel.findOne({ user: userId });

      if (!subscription) {
        subscription = new SubscriptionModel({
          user: userId,
          plan, // Set the plan here
          status: 'pending',
          maxListings: planDetails.maxListings,
          currentPeriodStart: null,
          currentPeriodEnd: null,
        });
      } else {
        // Update existing subscription plan
        subscription.plan = plan;
        subscription.maxListings = planDetails.maxListings;
        subscription.status = 'pending';
      }

      // Initialize Paystack transaction
      const paymentInitiation = await paystackService.initializeTransaction({
        amount: planPrices[plan],
        email: user.email,
        metadata: {
          userId: userId,
          plan: plan, // Include plan in metadata
          type: 'subscription',
        },
      });

      // Add to payment history WITH PLAN
      subscription.paymentHistory.push({
        transactionReference: paymentInitiation.reference,
        amount: planPrices[plan],
        status: 'pending',
        date: new Date(),
        plan: plan, // ✅ Store the plan in payment history
      });

      await subscription.save();

      return {
        authorizationUrl: paymentInitiation.authorization_url,
        reference: paymentInitiation.reference,
      };
    } catch (error) {
      logger.error('Subscription payment initiation failed', error);
      throw error;
    }
  }

  // Verify Payment
  async verifyPayment(reference) {
    try {
      console.log('🔍 Verifying payment for reference:', reference);
      
      // Verify Paystack transaction
      const verificationResult = await paystackService.verifyTransaction(reference);
      
      console.log('💳 Paystack verification result:', {
        status: verificationResult.status,
        amount: verificationResult.amount,
        metadata: verificationResult.metadata
      });

      // Find subscription by payment history
      const subscription = await SubscriptionModel.findOne({
        'paymentHistory.transactionReference': reference,
      });

      if (!subscription) {
        throw new Error('Subscription not found for this transaction');
      }

      console.log('📋 Current subscription before update:', {
        plan: subscription.plan,
        status: subscription.status,
        maxListings: subscription.maxListings
      });

      // Get the payment record to find the plan
      const paymentRecord = subscription.paymentHistory.find(
        payment => payment.transactionReference === reference
      );

      if (!paymentRecord) {
        throw new Error('Payment history not found for this transaction');
      }

      console.log('💰 Payment record:', {
        plan: paymentRecord.plan,
        amount: paymentRecord.amount,
        status: paymentRecord.status
      });

      // Check if payment is already successfully processed
      if (paymentRecord.status === 'success') {
        logger.info('Payment already processed successfully', { reference });
        return {
          success: true,
          message: 'Subscription already activated',
          subscription,
          alreadyProcessed: true,
        };
      }

      // Update payment history status
      paymentRecord.status = verificationResult.status === 'success' ? 'success' : 'failed';
      paymentRecord.date = new Date();

      // Check payment status
      if (verificationResult.status === 'success') {
        // Use plan from payment record (most reliable) or fall back to metadata or current plan
        const planToUpdate = paymentRecord.plan || 
                            verificationResult.metadata?.plan || 
                            subscription.plan;
        
        console.log('🎯 Plan to update to:', planToUpdate);

        // Update subscription details
        subscription.status = 'active';
        subscription.plan = planToUpdate; // Update to the paid plan
        subscription.maxListings = this.getMaxListings(planToUpdate);
        subscription.currentPeriodStart = new Date();
        subscription.currentPeriodEnd = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
        );

        await subscription.save();

        console.log('✅ Subscription after update:', {
          plan: subscription.plan,
          status: subscription.status,
          maxListings: subscription.maxListings
        });

        logger.info('Subscription updated successfully', {
          reference,
          plan: planToUpdate,
          status: 'active'
        });

        return {
          success: true,
          message: 'Subscription activated successfully',
          subscription,
        };
      } else {
        subscription.status = 'payment_failed';
        await subscription.save();

        return {
          success: false,
          message: 'Payment verification failed',
          subscription,
        };
      }
    } catch (error) {
      console.error('❌ Verification error:', error);
      logger.error('Failed to verify payment', error);
      throw error;
    }
  }

  // Get Subscription History
  async getSubscriptionHistory(userId) {
    try {
      const subscriptions = await SubscriptionModel.find({ user: userId }).sort(
        { createdAt: -1 }
      );
      return subscriptions;
    } catch (error) {
      logger.error('Failed to get subscription history', error);
      throw error;
    }
  }

  // Cancel Subscription
  async cancelSubscription(userId) {
    try {
      const subscription = await SubscriptionModel.findOne({ user: userId });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Don't delete, just change status
      subscription.status = 'cancelled';
      await subscription.save();

      return {
        success: true,
        message: 'Subscription cancelled successfully',
      };
    } catch (error) {
      logger.error('Failed to cancel subscription', error);
      throw error;
    }
  }

  // Reactivate Subscription
  async reactivateSubscription(userId) {
    try {
      const subscription = await SubscriptionModel.findOne({ user: userId });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.plan === 'basic') {
        subscription.status = 'active'; // ✅ Fixed: basic should be active, not pending
        await subscription.save();
        return {
          success: true,
          message: 'Subscription reactivated',
        };
      }

      // For paid plans, initiate payment
      return await this.initiateSubscriptionPayment(userId, subscription.plan); // ✅ Fixed method name
    } catch (error) {
      logger.error('Failed to reactivate subscription', error);
      throw error;
    }
  }

  // Check Subscription Eligibility
  async checkSubscriptionEligibility(userId) {
    try {
      let subscription = await SubscriptionModel.findOne({ user: userId });

      // If no subscription exists, create a basic one
      if (!subscription) {
        subscription = new SubscriptionModel({
          user: userId,
          plan: 'basic',
          status: 'active', // ✅ Basic plan is immediately active (free)
          maxListings: 1,
        });
        await subscription.save();
      }

      // Basic plan listing limit check
      if (subscription.plan === 'basic') {
        const listingCount = await PropertyModel.countDocuments({
          owner: userId,
        });

        if (listingCount >= subscription.maxListings) {
          return {
            eligible: false,
            reason: 'Listing limit reached',
            action: 'upgrade_plan',
          };
        }
      }

      // Check if subscription is active/valid
      if (subscription.status !== 'active' && subscription.status !== 'trial') {
        return {
          eligible: false,
          reason: 'Inactive subscription',
          action: 'reactivate',
        };
      }

      // Check if paid subscription is still valid (only for paid plans)
      if (
        subscription.plan !== 'basic' && // ✅ Only check expiry for paid plans
        subscription.currentPeriodEnd &&
        new Date() > subscription.currentPeriodEnd
      ) {
        return {
          eligible: false,
          reason: 'Subscription expired',
          action: 'renew',
        };
      }

      // Trial period check
      if (subscription.status === 'trial' && subscription.trialEndDate) {
        const now = new Date();
        if (now > subscription.trialEndDate) {
          return {
            eligible: false,
            reason: 'Trial expired',
            action: 'initiate_payment',
          };
        }
      }

      return {
        eligible: true,
        plan: subscription.plan,
        maxListings: subscription.maxListings,
      };
    } catch (error) {
      logger.error('Failed to check subscription eligibility', error);
      throw error;
    }
  }

  // Get Current Subscription
  async getCurrentSubscription(userId) {
    try {
      let subscription = await SubscriptionModel.findOne({ user: userId });

      // If no subscription exists, create a basic one
      if (!subscription) {
        subscription = new SubscriptionModel({
          user: userId,
          plan: 'basic',
          status: 'active',  // ✅ Basic is free, so immediately active
          maxListings: 1,
        });
        await subscription.save();
      }

      return subscription;
    } catch (error) {
      logger.error('Failed to get current subscription', error);
      throw error;
    }
  }

  // Update Payment Method
  async updatePaymentMethod(userId, paymentDetails) {
    try {
      const user = await UserModel.findById(userId);

      // Create/Update Paystack Customer
      const customerResponse = await this.paystackClient.customer.create({
        email: user.email,
        first_name: user.name.split(' ')[0],
        last_name: user.name.split(' ')[1],
        phone: user.phoneNumber,
      });

      // Update User Payment Method
      user.paymentMethod = {
        cardType: paymentDetails.type,
        last4: paymentDetails.last4,
        expiryMonth: paymentDetails.expiryMonth,
        expiryYear: paymentDetails.expiryYear,
        authorizationCode: customerResponse.data.authorization_code,
      };
      user.paystackCustomerId = customerResponse.data.customer_code;
      await user.save();

      return {
        success: true,
        message: 'Payment method updated successfully',
      };
    } catch (error) {
      throw new Error('Failed to update payment method');
    }
  }

  // Retry Payment
  async retryPayment(userId) {
    const subscription = await SubscriptionModel.findOne({ user: userId });
    const user = await UserModel.findById(userId);

    if (!user.paymentMethod) {
      throw new Error('No payment method available');
    }

    try {
      // Charge using saved customer authorization
      const chargeResponse = await this.paystackClient.transaction.charge({
        amount: this.getPlanPrice(subscription.plan) * 100,
        email: user.email,
        authorization_code: user.paymentMethod.authorizationCode,
      });

      if (chargeResponse.status === 'success') {
        // Update subscription
        subscription.status = 'active';
        subscription.currentPeriodStart = new Date();
        subscription.currentPeriodEnd = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        );
        subscription.retryCount = 0;
        await subscription.save();

        return {
          success: true,
          message: 'Payment successful',
        };
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      // Increment retry count
      subscription.retryCount += 1;
      await subscription.save();

      if (subscription.retryCount >= 3) {
        subscription.status = 'suspended';
        await subscription.save();
      }

      throw error;
    }
  }

  // Automatic Renewal
  async processSubscriptionRenewals() {
    // Find subscriptions expiring soon
    const expiringSubscriptions = await SubscriptionModel.find({
      status: 'active',
      currentPeriodEnd: {
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    for (const subscription of expiringSubscriptions) {
      try {
        await this.automaticRenewal(subscription);
      } catch (error) {
        logger.error(
          `Renewal failed for subscription ${subscription._id}`,
          error
        );
        await this.handleRenewalFailure(subscription);
      }
    }
  }

  // Automatic Renewal Method
  async automaticRenewal(subscription) {
    const planDetails = this.getPlanDetails()[subscription.plan];

    // Initialize renewal payment
    const paymentInitiation = await paystackService.initializeTransaction({
      amount: planDetails.price,
      email: subscription.user.email,
      metadata: {
        userId: subscription.user,
        plan: subscription.plan,
        type: 'subscription_renewal',
        subscriptionId: subscription._id,
      },
    });

    // Update subscription with renewal reference
    subscription.renewalTransactionReference = paymentInitiation.reference;
    subscription.status = 'renewal_pending';
    await subscription.save();

    return paymentInitiation;
  }

  async attemptSubscriptionRenewal(subscription) {
    const user = await UserModel.findById(subscription.user);

    if (!user.paymentMethod) {
      throw new Error('No payment method');
    }

    const chargeResponse = await this.paystackClient.transaction.charge({
      amount: this.getPlanPrice(subscription.plan) * 100,
      email: user.email,
      authorization_code: user.paymentMethod.authorizationCode,
    });

    if (chargeResponse.status === 'success') {
      subscription.currentPeriodStart = new Date();
      subscription.currentPeriodEnd = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      );
      await subscription.save();

      // Optional: Send renewal confirmation email
    } else {
      throw new Error('Renewal payment failed');
    }
  }

  async handleRenewalFailure(subscription) {
    subscription.status = 'expired';
    await subscription.save();

    // Send notification to user about failed renewal
    // Implement email or SMS notification logic here
  }
}

export default SubscriptionService;