import express from 'express';
import { Route } from '../../interfaces/route.interface.js';
import WebhookController from '../../controller/payment/webhook.controller.js';

class PaymentRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/payment';
    this.controller = new WebhookController();
    this.initializeRoute();
  }
  initializeRoutes() {
    this.router.post(`${this.path}/paystack/webhook`, this.controller.webhook);
    // this.router.post(`${this.path}/paystack/webhook`, this.controller.g);
  }
}
