import express from 'express';

import { isAuthenticated } from '../../middlewares/auth.js';
import { Route } from '../../interfaces/route.interface.js';
import MessageController from '../../controller/chat/message.controller.js';

class MessageRoute extends Route {
  constructor() {
    super(express.Router()); // Initialize the parent class
    this.path = '/conversations/:conversationId'; // Set the base path
    this.controller = new MessageController(); // Instantiate the controller
    this.initializeRoute();
  }
  initializeRoute() {
    this.router.post(
      `${this.path}/messages`,
      isAuthenticated,
      uploadFiles([{ name: 'attachments', maxCount: 10 }]),
      this.controller.sendMessage
    );
    this.router.get(
      `${this.path}/messages`,
      isAuthenticated,
      this.controller.getMessages
    );
    this.router.post(
      `${this.path}/read`,
      isAuthenticated,
      this.controller.markAsRead
    );
  }
}
