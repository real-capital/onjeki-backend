import { StatusCodes } from 'http-status-codes';
import RentSalesChatService from '../../services/conversation/rentSalesChat.service.js';

const rentSalesChatService = new RentSalesChatService();

class RentOrSalesChatController {
  // Start a conversation about a property
  startConversation = async (req, res, next) => {
    try {
      const { propertyId, message } = req.body;
      const userId = req.user._id;

      if (!propertyId || !message) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          message: 'Property ID and message are required',
        });
      }

      const result = await rentSalesChatService.startConversation(
        userId,
        propertyId,
        message
      );

      res.status(StatusCodes.CREATED).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // Get user's rent/sales conversations
  getConversations = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 20, role } = req.query;

      const result = await rentSalesChatService.getConversations(
        userId,
        role,
        parseInt(page),
        parseInt(limit)
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // Get conversation messages
  getConversationMessages = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user._id;
      const { page = 1, limit = 50 } = req.query;

      const result = await rentSalesChatService.getConversationMessages(
        conversationId,
        userId,
        parseInt(page),
        parseInt(limit)
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // Send a message
  sendMessage = async (req, res, next) => {
    try {
      const { conversationId, content, attachments } = req.body;
      const userId = req.user._id;

      if (!conversationId || !content) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          status: 'error',
          message: 'Conversation ID and message content are required',
        });
      }

      const message = await rentSalesChatService.sendMessage(
        conversationId,
        userId,
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

  // Mark a message as read
  markMessageAsRead = async (req, res, next) => {
    try {
      const { messageId, conversationId } = req.params;
      const userId = req.user._id;

      const result = await rentSalesChatService.markMessageAsRead(
        messageId,
        conversationId,
        userId
      );

      res.status(StatusCodes.OK).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default RentOrSalesChatController;
