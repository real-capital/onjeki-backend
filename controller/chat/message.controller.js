import MessageService from '../../services/chat/message.service';
import Conversation from '../../models/conversation.model';
import Message from '../../models/message.model.js';
import { StatusCodes } from 'http-status-codes';

const messageService = new MessageService();
class MessageController {
  sendMessage = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const { content } = req.body;
      const files = req.files;

      const message = await messageService.sendMessage({
        conversationId,
        senderId: req.user.id,
        content,
        attachments: files,
      });

      res.status(201).json({
        status: 'success',
        data: { message },
      });
    } catch (error) {
      next(error);
    }
  };

  getMessages = async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const messages = await Message.find({ conversation: conversationId })
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('sender', 'profile.name profile.photo');

      res.status(200).json({
        status: 'success',
        data: { messages },
      });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req, res, next) => {
    try {
      const { conversationId } = req.params;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return next(
          new HttpException(StatusCodes.NOT_FOUND, 'Conversation not found')
        );
      }

      // Mark messages as read
      await Message.updateMany(
        {
          conversation: conversationId,
          'readBy.user': { $ne: req.user.id },
        },
        {
          $addToSet: {
            readBy: { user: req.user.id },
          },
        }
      );

      // Update unread count
      conversation.unreadCounts.set(req.user.id.toString(), 0);
      await conversation.save();

      res.status(200).json({
        status: 'success',
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default MessageController;
