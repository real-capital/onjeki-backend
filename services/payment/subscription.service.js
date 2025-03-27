// services/subscriptionService.js
import paystack from 'paystack';
import UserModel from '../../models/user.model.js';
import SubscriptionModel from '../../models/subscription.model.js';
import PropertyModel from '../../models/properties.model.js';
import PaystackService from './payment.service.js';

const paystackService = new PaystackService();

class SubscriptionService {
  constructor() {
    this.paystackClient = paystack(
      process.env.PAYSTACK_SECRET_KEY ||
        'sk_test_0878d8880fb3c31445795a4b632941c3f2cba4ec'
    );
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
        return 100;
      case 'enterprise':
        return 1000000;
      default:
        return 1;
    }
  }

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
        premium: 3000, // ₦3000
        enterprise: 10000, // ₦10000
      };

      // Validate plan
      if (!planPrices[plan]) {
        throw new Error('Invalid subscription plan');
      }

      // Create or update subscription record
      let subscription = await SubscriptionModel.findOne({ user: userId });

      if (!subscription) {
        subscription = new SubscriptionModel({
          user: userId,
          plan,
          status: 'pending',
          currentPeriodStart: null,
          currentPeriodEnd: null,
        });
      }

      // Initialize Paystack transaction
      const paymentInitiation = await paystackService.initializeTransaction({
        amount: planPrices[plan],
        email: user.email,
        metadata: {
          userId: userId,
          plan: plan,
          type: 'subscription',
        },
      });

      // Update subscription with transaction reference
      subscription.transactionReference = paymentInitiation.reference;
      await subscription.save();

      return {
        authorizationUrl: paymentInitiation.authorization_url,
        reference: paymentInitiation.reference,
      };
    } catch (error) {
      this.logger.error('Subscription payment initiation failed', error);
      throw error;
    }
  }

  // Verify Payment
  async verifyPayment(reference) {
    // Verify Paystack transaction
    const verificationResult = await paystackService.verifyTransaction(
      reference
    );

    // Find subscription by metadata
    const subscription = await SubscriptionModel.findOne({
      'paymentHistory.transactionReference': reference,
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    // Update payment history
    subscription.paymentHistory.push({
      amount: verificationResult.amount,
      date: new Date(),
      status: verificationResult.status === 'success' ? 'success' : 'failed',
      transactionReference: reference,
    });

    // Check payment status
    if (verificationResult.status === 'success') {
      // Update subscription details
      subscription.status = 'active';
      subscription.currentPeriodStart = new Date();
      subscription.currentPeriodEnd = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
      );

      await subscription.save();

      return {
        success: true,
        message: 'Subscription activated successfully',
        subscription,
      };
    } else {
      // Update subscription status to failed
      subscription.status = 'payment_failed';
      await subscription.save();

      return {
        success: false,
        message: 'Payment verification failed',
        subscription,
      };
    }
  }

  async verifySubscriptionPayment(reference) {
    try {
      // Verify Paystack transaction
      const verificationResult = await paystackService.verifyTransaction(
        reference
      );

      // Find subscription by reference
      const subscription = await SubscriptionModel.findOne({
        transactionReference: reference,
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Check payment status
      if (verificationResult.status === 'success') {
        // Update subscription details
        subscription.status = 'active';
        subscription.currentPeriodStart = new Date();
        subscription.currentPeriodEnd = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
        );

        await subscription.save();

        return {
          success: true,
          message: 'Subscription activated successfully',
          subscription,
        };
      } else {
        // Update subscription status to failed
        subscription.status = 'payment_failed';
        await subscription.save();

        return {
          success: false,
          message: 'Payment verification failed',
        };
      }
    } catch (error) {
      this.logger.error('Subscription payment verification failed', error);
      throw error;
    }
  }

  // Initialize Subscription
  async initializeSubscription(userId, plan) {
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
        status: plan === 'premium' ? 'trial' : 'basic',
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
    }

    return subscription;
  }

  // Check Subscription Eligibility
  async checkSubscriptionEligibility(userId) {
    const subscription = await SubscriptionModel.findOne({ user: userId });

    if (!subscription) {
      return {
        eligible: false,
        reason: 'No subscription found',
        action: 'select_plan',
      };
    }

    // Basic plan listing limit
    if (subscription.plan === 'basic') {
      const listingCount = await PropertyModel.countDocuments({
        owner: userId,
      });
      console.log(listingCount);
      if (listingCount >= subscription.maxListings) {
        return {
          eligible: false,
          reason: 'Listing limit reached',
          action: 'upgrade_plan',
        };
      }
    }
    // Check active subscription
    if (
      subscription.status !== 'active' &&
      subscription.status !== 'trial' &&
      subscription.status !== 'basic'
    ) {
      return {
        eligible: false,
        reason: 'Inactive subscription',
        action: 'reactivate',
      };
    }

    // Check if subscription is still valid
    if (new Date() > subscription.currentPeriodEnd) {
      return {
        eligible: false,
        reason: 'Subscription expired',
        action: 'renew',
      };
    }

    // Trial period check
    if (subscription.status === 'trial') {
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
  }

  // Initiate Payment
  async initiatePayment(userId, plan) {
    const planDetails = this.getPlanDetails()[plan];
    if (!planDetails) {
      throw new Error('Invalid subscription plan');
    }

    const user = await UserModel.findById(userId);

    // Initialize Paystack transaction
    const paymentInitiation = await paystackService.initializeTransaction({
      amount: planDetails.price,
      email: user.email,
      metadata: {
        userId,
        plan,
        type: 'subscription',
      },
    });

    return {
      authorizationUrl: paymentInitiation.authorization_url,
      reference: paymentInitiation.reference,
    };
  }

  // Update Payment Method
  async updatePaymentMethod(userId, paymentDetails) {
    try {
      const user = await UserModel.findById(userId);

      // Create/Update Paystack Customer
      const customerResponse = await this.paystackClient.customer.create({
        email: user.email,
        first_name: user.name.split[0],
        last_name: user.name.split[1],
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
        this.logger.error(
          `Renewal failed for subscription ${subscription._id}`,
          error
        );
        await this.handleRenewalFailure(subscription);
      }
    }
  }

  // Process Subscription Renewals (Cron Job)
  //   async processSubscriptionRenewals() {
  //     const expiringSubscriptions = await SubscriptionModel.find({
  //       status: 'active',
  //       currentPeriodEnd: {
  //         $gte: new Date(),
  //         $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  //       },
  //     });

  //     for (let subscription of expiringSubscriptions) {
  //       try {
  //         await this.attemptSubscriptionRenewal(subscription);
  //       } catch (error) {
  //         // Log failure, send notification
  //         await this.handleRenewalFailure(subscription);
  //       }
  //     }
  //   }

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
