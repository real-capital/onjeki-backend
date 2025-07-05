
import { StatusCodes } from 'http-status-codes';

class ConversationController {
  constructor(conversationService) {
    if (!conversationService) {
      throw new Error('Conversation Service is required');
    }

    this.conversationService = conversationService;

    this.createConversation = this.createConversation.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.getConversations = this.getConversations.bind(this);
    this.getConversationMessages = this.getConversationMessages.bind(this);
    this.archiveConversation = this.archiveConversation.bind(this);
  }

  createConversation = async (req, res, next) => {
    try {
      const { participants, metadata } = req.body;
      const conversation = await this.conversationService.createConversation(
        participants,
        metadata
      );

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  };

  sendMessage = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const { content, attachments } = req.body;
      const senderId = req.user._id;

      const message = await this.conversationService.sendMessage(
        senderId,
        conversationId,
        content,
        attachments
      );

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: message,
      });
    } catch (error) {
      next(error);
    }
  };

  getConversations = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { page, limit, role } = req.query;

      const result = await this.conversationService.getConversations(
        userId,
        role,
        {
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 20,
        }
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getConversationMessages = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user._id;
      const { page, limit } = req.query;

      const result = await this.conversationService.getConversationMessages(
        conversationId,
        userId,
        {
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 50,
        }
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  archiveConversation = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user._id;

      const conversation = await this.conversationService.archiveConversation(
        conversationId,
        userId
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default ConversationController;
