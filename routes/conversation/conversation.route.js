import express from 'express';
import { Route } from '../../interfaces/route.interface.js';
import { isAuthenticated } from '../../middlewares/auth.js';
import ConversationController from '../../controller/conversation/conversation.controller.js';
import ServiceContainer from '../../services/ServiceContainer.js';
import { logger } from '../../utils/logger.js';
// import {
//   createConversationValidation,
//   sendMessageValidation
// } from '../validations/conversation.validation.js';

class ConversationRoute extends Route {
  constructor() {
    super(); // Initialize the parent class
    this.path = '/conversations';

    try {
      const conversationService = ServiceContainer.get('conversationService');
      this.controller = new ConversationController(conversationService);
      this.initializeRoutes();
    } catch (error) {
      logger.error('Error initializing ConversationRoute:', error);
      throw error;
    }
  }

  initializeRoutes() {
    // Create a new conversation
    this.router.post(
      `${this.path}`,
      isAuthenticated,
      //   createConversationValidation,
      this.controller.createConversation
    );

    // Send a message in a conversation
    this.router.post(
      `${this.path}/:conversationId/messages`,
      isAuthenticated,
      //   sendMessageValidation,
      this.controller.sendMessage
    );

    // Get user's conversations
    this.router.get(
      `${this.path}`,
      isAuthenticated,
      this.controller.getConversations
    );

    // Get messages in a specific conversation
    this.router.get(
      `${this.path}/:conversationId/messages`,
      isAuthenticated,
      this.controller.getConversationMessages
    );

    // Archive a conversation
    this.router.patch(
      `${this.path}/:conversationId/archive`,
      isAuthenticated,
      this.controller.archiveConversation
    );
  }
}

export default ConversationRoute;
