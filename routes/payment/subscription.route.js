

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
    // Initialize subscription
    this.router.post(
      `${this.path}/initialize`,
      isAuthenticated,
      this.controller.initializeSubscription
    );
    
    // Check eligibility
    this.router.get(
      `${this.path}/eligibility`,
      isAuthenticated,
      this.controller.checkEligibility
    );
    
    // Initiate payment
    this.router.post(
      `${this.path}/payment`,
      isAuthenticated,
      this.controller.initiatePayment
    );
    
    // Verify payment
    this.router.post(
      `${this.path}/verify`,
      isAuthenticated,
      this.controller.verifyPayment
    );
    
    // Get current subscription
    this.router.get(
      `${this.path}/current`,
      isAuthenticated,
      this.controller.getCurrentSubscription
    );
    
    // Get subscription history
    this.router.get(
      `${this.path}/history`,
      isAuthenticated,
      this.controller.getSubscriptionHistory
    );
    
    // Cancel subscription
    this.router.post(
      `${this.path}/cancel`,
      isAuthenticated,
      this.controller.cancelSubscription
    );
    
    // Reactivate subscription
    this.router.post(
      `${this.path}/reactivate`,
      isAuthenticated,
      this.controller.reactivateSubscription
    );
  }
}

export default SubscriptionRoute;