// routes/bank.route.js
import express from 'express';
import { Route } from '../../interfaces/route.interface.js';
import BankController from '../../controller/payment/bank.controller.js';
import { isAuthenticated } from '../../middlewares/auth.js';

class BankRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/banks';
    this.controller = new BankController();
    this.initializeRoute();
  }

  initializeRoute() {
    // Get list of banks
    this.router.get(
      `${this.path}/list`,
      isAuthenticated,
      this.controller.getBanks
    );

    // Verify bank account
    this.router.post(
      `${this.path}/verify`,
      isAuthenticated,
      this.controller.verifyBankAccount
    );
  }
}

export default BankRoute;