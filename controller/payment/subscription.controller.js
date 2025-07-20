


import SubscriptionService from '../../services/payment/subscription.service.js';

const subscriptionService = new SubscriptionService();

class SubscriptionController {
  // Initialize Subscription
  async initializeSubscription(req, res, next) {
    try {
      const { plan } = req.body;
      const userId = req.user.id;

      const subscription = await subscriptionService.initializeSubscription(
        userId,
        plan
      );

      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  // Check Eligibility
  async checkEligibility(req, res, next) {
    try {
      const userId = req.user.id;

      const eligibility =
        await subscriptionService.checkSubscriptionEligibility(userId);

      res.status(200).json({
        success: true,
        data: eligibility,
      });
    } catch (error) {
      next(error);
    }
  }

  // Initiate Payment
  async initiatePayment(req, res, next) {
    try {
      const { plan } = req.body;
      const userId = req.user.id;

      const paymentDetails = await subscriptionService.initiateSubscriptionPayment(
        userId,
        plan
      );

      res.status(200).json({
        success: true,
        data: paymentDetails,
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify Payment
  async verifyPayment(req, res, next) {
    try {
      const { reference } = req.body;

      const verificationResult = await subscriptionService.verifyPayment(
        reference
      );

      res.status(200).json({
        success: true,
        data: verificationResult,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Current Subscription
  async getCurrentSubscription(req, res, next) {
    try {
      const userId = req.user.id;

      const subscription = await subscriptionService.getCurrentSubscription(userId);

      res.status(200).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Subscription History
  async getSubscriptionHistory(req, res, next) {
    try {
      const userId = req.user.id;

      const history = await subscriptionService.getSubscriptionHistory(userId);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  // Cancel Subscription
  async cancelSubscription(req, res, next) {
    try {
      const userId = req.user.id;

      const result = await subscriptionService.cancelSubscription(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Reactivate Subscription
  async reactivateSubscription(req, res, next) {
    try {
      const userId = req.user.id;

      const result = await subscriptionService.reactivateSubscription(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default SubscriptionController;