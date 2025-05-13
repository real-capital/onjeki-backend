import express from 'express';
import { Route } from '../../interfaces/route.interface.js';
import { isAuthenticated } from '../../middlewares/auth.js';
import RentOrSalesChatController from '../../controller/conversation/rent-or-sales-chat.controller.js';

class RentSalesChatRoute extends Route {
  constructor() {
    super(express.Router());
    this.path = '/rent-sales-chat';
    this.controller = new RentOrSalesChatController();
    this.initializeRoute();
  }

  initializeRoute() {
    this.router.post(
      `${this.path}/start`,
      isAuthenticated,
      this.controller.startConversation
    );
    this.router.get(
      `${this.path}/conversations`,
      isAuthenticated,
      this.controller.getUserConversations
    );
    this.router.get(
      `${this.path}/conversations/:conversationId/messages`,
      isAuthenticated,
      this.controller.getConversationMessages
    );
    this.router.post(
      `${this.path}/messages`,
      isAuthenticated,
      this.controller.sendMessage
    );
    this.router.put(
      `${this.path}/messages/:messageId/conversations/:conversationId/read`,
      isAuthenticated,
      this.controller.markMessageAsRead
    );
  }
}

export default RentSalesChatRoute;
