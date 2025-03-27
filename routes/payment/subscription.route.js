import express from 'express';
import { Route } from '../../interfaces/route.interface.js';
import SubscriptionController from '../../controller/payment/subscription.controller.js';
import { isAuthenticated } from '../../middlewares/auth.js';

class SubscriptionRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/subscribe';
    this.controller = new SubscriptionController();
    this.initializeRoute();
  }
  initializeRoute() {
    this.router.post(
      `${this.path}/initialize`,
      isAuthenticated,
      this.controller.initializeSubscription
    );
    this.router.get(
      `${this.path}/eligibility`,
      isAuthenticated,
      this.controller.checkEligibility
    );
    this.router.post(
      `${this.path}/payment`,
      isAuthenticated,
      this.controller.initiatePayment
    );
    this.router.post(
      `${this.path}/verify`,
      isAuthenticated,
      this.controller.verifyPayment
    );
  }
}

export default SubscriptionRoute;
