import { StatusCodes } from 'http-status-codes';
import ConversationService from '../../services/conversation/conversation.service.js';

const conversationService = new ConversationService();
class ConversationController {
  //   constructor(conversationService) {
  //     conversationService = conversationService;
  //   }

  createConversation = async (req, res, next) => {
    try {
      const { participants, metadata } = req.body;
      const conversation = await conversationService.createConversation(
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

      const message = await conversationService.sendMessage(
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
      const { page, limit, status } = req.query;

      const conversations = await conversationService.getConversations(
        userId,
        { page, limit, status }
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: conversations,
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

      const messages = await conversationService.getConversationMessages(
        conversationId,
        userId,
        { page, limit }
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  };

  archiveConversation = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user._id;

      const conversation = await conversationService.archiveConversation(
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
