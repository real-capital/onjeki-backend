// chat.controller.js

import ChatModel from '../../models/chat.model.js';
import Message from '../../models/message_model.js';
import ChatService from '../../services/chat/chat.service.js';

const chatService = new ChatService();

class ChatController {
  // Get all chats for a user
  async getUserChats(req, res) {
    try {
      const userId = req.user._id;
      const chats = await ChatModel.find({ participants: userId })
        .populate('participants', 'name email avatar')
        .populate('property', 'title photos')
        .sort({ updatedAt: -1 });

      // Connect user to all their chat rooms
      chatService.handleUserConnect(
        userId,
        chats.map((chat) => chat._id)
      );

      res.json({
        status: 'success',
        data: chats,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }
  //   async getUserChats(req, res) {
  //     try {
  //       const userId = req.user._id;
  //       const chats = await ChatModel.find({ participants: userId })
  //         .populate('participants', 'name email avatar')
  //         .populate('property', 'title photos')
  //         .sort({ updatedAt: -1 });

  //       res.json({
  //         status: 'success',
  //         data: chats,
  //       });
  //     } catch (error) {
  //       res.status(500).json({
  //         status: 'error',
  //         message: error.message,
  //       });
  //     }
  //   }

  // Get a specific chat by ID
  async getChatById(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user._id;

      const chat = await ChatModel.findOne({
        _id: chatId,
        participants: userId,
      })
        .populate('participants', 'name email avatar')
        .populate('property', 'title photos');

      if (!chat) {
        return res.status(404).json({
          status: 'error',
          message: 'Chat not found or unauthorized',
        });
      }

      res.json({
        status: 'success',
        data: chat,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  // Get messages for a chat
  async getChatMessages(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user._id;
      const { page = 1, limit = 50 } = req.query;

      // Verify user is participant in chat
      const chat = await ChatModel.findOne({
        _id: chatId,
        participants: userId,
      });

      if (!chat) {
        return res.status(404).json({
          status: 'error',
          message: 'Chat not found or unauthorized',
        });
      }

      const messages = await Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('sender', 'name avatar');

      res.json({
        status: 'success',
        data: messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: await Message.countDocuments({ chat: chatId }),
        },
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  // Create a new chat
  async createChat(req, res) {
    try {
      const { propertyId, recipientId } = req.body;
      const userId = req.user._id;

      // Create chat using chat service
      const chat = await chatService.createChat(
        userId,
        recipientId,
        propertyId
      );

      // Join participants to chat room
      chatService.handleJoinChat(chat._id, [userId, recipientId]);

      res.status(201).json({
        status: 'success',
        data: chat,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }
  //   async createChat(req, res) {
  //     try {
  //         const { propertyId, recipientId } = req.body;
  //         console.log(req.body);
  //       const userId = req.user._id;

  //       // Check if chat already exists
  //       let chat = await ChatModel.findOne({
  //         property: propertyId,
  //         participants: { $all: [userId, recipientId] },
  //       });

  //       if (chat) {
  //         return res.json({
  //           status: 'success',
  //           data: chat,
  //         });
  //       }

  //       // Create new chat
  //       chat = await ChatModel.create({
  //         property: propertyId,
  //         participants: [userId, recipientId],
  //         createdBy: userId,
  //       });

  //       await chat.populate('participants', 'name email avatar');
  //       await chat.populate('property', 'title photos');

  //       res.status(201).json({
  //         status: 'success',
  //         data: chat,
  //       });
  //     } catch (error) {
  //       res.status(500).json({
  //         status: 'error',
  //         message: error.message,
  //       });
  //     }
  //   }

  // Mark messages as read
  async markMessagesAsRead(req, res) {
    try {
      const { chatId } = req.params;
      const { messageIds } = req.body;
      const userId = req.user._id;

      // Verify user is participant in chat
      const chat = await ChatModel.findOne({
        _id: chatId,
        participants: userId,
      });

      if (!chat) {
        return res.status(404).json({
          status: 'error',
          message: 'Chat not found or unauthorized',
        });
      }

      // Update messages
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          chat: chatId,
          'readBy.user': { $ne: userId },
        },
        {
          $push: {
            readBy: {
              user: userId,
              readAt: new Date(),
            },
          },
        }
      );

      res.json({
        status: 'success',
        message: 'Messages marked as read',
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  // Upload chat attachment
  async uploadAttachment(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user._id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          status: 'error',
          message: 'No file uploaded',
        });
      }

      // Verify user is participant in chat
      const chat = await ChatModel.findOne({
        _id: chatId,
        participants: userId,
      });

      if (!chat) {
        return res.status(404).json({
          status: 'error',
          message: 'Chat not found or unauthorized',
        });
      }

      // Upload file to storage (e.g., S3)
      const uploadResult = await uploadToStorage(file);

      res.json({
        status: 'success',
        data: {
          id: uploadResult.id,
          url: uploadResult.url,
          type: file.mimetype,
          name: file.originalname,
          size: file.size,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  // Delete chat
  async deleteChat(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user._id;

      const chat = await ChatModel.findOneAndDelete({
        _id: chatId,
        participants: userId,
      });

      if (!chat) {
        return res.status(404).json({
          status: 'error',
          message: 'Chat not found or unauthorized',
        });
      }

      // Delete all messages in chat
      await Message.deleteMany({ chat: chatId });

      res.json({
        status: 'success',
        message: 'Chat deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  // Get chat statistics
  async getChatStats(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user._id;

      const chat = await ChatModel.findOne({
        _id: chatId,
        participants: userId,
      });

      if (!chat) {
        return res.status(404).json({
          status: 'error',
          message: 'Chat not found or unauthorized',
        });
      }

      const stats = await Message.aggregate([
        { $match: { chat: chat._id } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            unreadMessages: {
              $sum: {
                $cond: [{ $not: [{ $in: [userId, '$readBy.user'] }] }, 1, 0],
              },
            },
            lastMessageAt: { $max: '$createdAt' },
          },
        },
      ]);

      res.json({
        status: 'success',
        data: stats[0] || {
          totalMessages: 0,
          unreadMessages: 0,
          lastMessageAt: null,
        },
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }
}

// Helper function for file upload
async function uploadToStorage(file) {
  // Implement your file upload logic here (e.g., to S3)
  // Return the upload result with id and url
}

export default ChatController;
