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

      const paymentDetails = await subscriptionService.initiatePayment(
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

  // Webhook Handler
//   async webhookHandler(req, res) {
//     try {
//       // Verify webhook signature
//       const isValidWebhook = this.paystackService.verifyWebhookSignature(
//         req.body,
//         req.headers['x-paystack-signature']
//       );

//       if (!isValidWebhook) {
//         return res.status(401).json({
//           status: 'error',
//           message: 'Invalid webhook',
//         });
//       }

//       const event = req.body;

//       // Process different event types
//       switch (event.event) {
//         case 'charge.success':
//           await this.handleChargeSuccess(event.data);
//           break;
//         case 'charge.failed':
//           await this.handleChargeFailed(event.data);
//           break;
//         default:
//           this.logger.info('Unhandled event', { event: event.event });
//       }

//       res.status(200).json({ status: 'success' });
//     } catch (error) {
//       this.logger.error('Webhook processing error', error);
//       res.status(500).json({
//         status: 'error',
//         message: 'Webhook processing failed',
//       });
//     }
//   }

  // Handle Successful Charge
//   async handleChargeSuccess(chargeData) {
//     try {
//       // Verify transaction
//       await subscriptionService.verifyPayment(chargeData.reference);
//     } catch (error) {
//       this.logger.error('Charge success handling failed', error);
//     }
//   }

//   // Handle Failed Charge
//   async handleChargeFailed(chargeData) {
//     try {
//       // Update subscription status
//       const subscription = await SubscriptionModel.findOne({
//         'paymentHistory.transactionReference': chargeData.reference,
//       });

//       if (subscription) {
//         subscription.status = 'renewal_failed';
//         await subscription.save();
//       }
//     } catch (error) {
//       this.logger.error('Charge failed handling failed', error);
//     }
//   }
}

export default SubscriptionController;
