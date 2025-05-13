// routes/payout.route.js
import express from 'express';
import { Route } from '../../interfaces/route.interface.js';
import PayoutController from '../../controller/payment/payout.controller.js';
import { isAuthenticated } from '../../middlewares/auth.js';

class PayoutRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/payouts';
    this.controller = new PayoutController();
    this.initializeRoute();
  }

  initializeRoute() {
    // Request a payout
    this.router.post(
      `${this.path}/request`,
      isAuthenticated,
      this.controller.requestPayout
    );

    // Get payout history
    this.router.get(
      `${this.path}`,
      isAuthenticated,
      this.controller.getPayoutHistory
    );

    // Check if payout method is set up
    this.router.get(
      `${this.path}/setup`,
      isAuthenticated,
      this.controller.checkPayoutSetup
    );

    // Get payout details
    this.router.get(
      `${this.path}/:payoutId`,
      isAuthenticated,
      this.controller.getPayoutDetails
    );
  }
}

export default PayoutRoute;