// routes/earnings.route.js
import express from 'express';
import { Route } from '../../interfaces/route.interface.js';
import { isAuthenticated } from '../../middlewares/auth.js';
import EarningController from '../../controller/payment/earning.controller.js';

class EarningsRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/earnings';
    this.controller = new EarningController();
    this.initializeRoute();
  }

  initializeRoute() {
    // Get all earnings for a host
    this.router.get(
      `${this.path}`,
      isAuthenticated,
      this.controller.getHostEarnings
    );

    // Get earnings summary
    this.router.get(
      `${this.path}/summary`,
      isAuthenticated,
      this.controller.getEarningsSummary
    );
     this.router.get(
      `${this.path}/analytics`,
      isAuthenticated,
      this.controller.getEarningsAnalytics
    );

    // Get single earning details
    this.router.get(
      `${this.path}/:earningId`,
      isAuthenticated,
      this.controller.getEarningDetails
    );
  }
}

export default EarningsRoute;