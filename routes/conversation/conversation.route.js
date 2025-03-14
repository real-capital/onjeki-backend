import express from 'express';
import { isAuthenticated } from '../../middlewares/auth.js';
import ConversationController from '../../controller/conversation/conversation.controller.js';
// import {
//   createConversationValidation,
//   sendMessageValidation
// } from '../validations/conversation.validation.js';

class ConversationRoute {
  constructor() {
    super(express.Router()); // Initialize the parent class
    this.path = '/properties';
    this.controller = new ConversationController();
    this.initializeRoutes();
  }

  initializeRoutes() {
    // Create a new conversation
    this.router.post(
      '/conversations',
      isAuthenticated,
      //   createConversationValidation,
      this.controller.createConversation
    );

    // Send a message in a conversation
    this.router.post(
      '/conversations/:conversationId/messages',
      isAuthenticated,
      //   sendMessageValidation,
      this.controller.sendMessage
    );

    // Get user's conversations
    this.router.get(
      '/conversations',
      isAuthenticated,
      this.controller.getConversations
    );

    // Get messages in a specific conversation
    this.router.get(
      '/conversations/:conversationId/messages',
      isAuthenticated,
      this.controller.getConversationMessages
    );

    // Archive a conversation
    this.router.patch(
      '/conversations/:conversationId/archive',
      isAuthenticated,
      this.controller.archiveConversation
    );
  }
}

export default ConversationRoute;
