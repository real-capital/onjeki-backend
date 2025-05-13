// routes/user-bank.route.js
import express from 'express';
import { Route } from '../../interfaces/route.interface.js';
import UserBankController from '../../controller/payment/user-bank.controller.js';
import { isAuthenticated } from '../../middlewares/auth.js';

class UserBankRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/user/bank-accounts';
    this.controller = new UserBankController();
    this.initializeRoute();
  }

  initializeRoute() {
    // Add a bank account
    this.router.post(
      `${this.path}`,
      isAuthenticated,
      this.controller.saveBankAccount
    );

    // Get all bank accounts
    this.router.get(
      `${this.path}`,
      isAuthenticated,
      this.controller.getBankAccounts
    );

    // Set a bank account as default
    this.router.put(
      `${this.path}/:bankAccountId/default`,
      isAuthenticated,
      this.controller.setDefaultBankAccount
    );

    // Delete a bank account
    this.router.delete(
      `${this.path}/:bankAccountId`,
      isAuthenticated,
      this.controller.deleteBankAccount
    );
  }
}

export default UserBankRoute;
