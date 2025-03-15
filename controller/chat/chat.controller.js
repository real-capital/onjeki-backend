// chat.controller.js

import ChatModel from '../../models/chat.model.js';
import Message from '../../models/message.model.js';
import ChatService from '../../services/chat/chat.service.js';

const chatService = new ChatService();

class ChatController {
  // Get all chats for a user
  //   async getUserChats(req, res) {
  //     try {
  //       const userId = req.user._id;
  //       const chats = await ChatModel.find({ participants: userId })
  //         .populate('participants', 'name email avatar')
  //         .populate('property', 'title photos')
  //         .sort({ updatedAt: -1 });
  //       console.log(chats);
  //       // Connect user to all their chat rooms
  //       chatService.handleUserConnect(
  //         userId,
  //         chats.map((chat) => chat._id)
  //       );

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

  async getUserChats(req, res) {
    try {
      const userId = req.user._id;

      // Get all chats where user is a participant
      const chats = await ChatModel.find({
        participants: userId,
      })
        .populate('participants', 'name email avatar')
        .populate('property', 'title photos')
        .sort({ updatedAt: -1 });

      // Get latest message for each chat
      const chatsWithMessages = await Promise.all(
        chats.map(async (chat) => {
          const latestMessage = await Message.findOne({ chat: chat._id })
            .sort({ createdAt: -1 })
            .populate('sender', 'name avatar');

          // Get unread messages count
          const unreadCount = await Message.countDocuments({
            chat: chat._id,
            sender: { $ne: userId },
            'readBy.user': { $ne: userId },
          });

          return {
            ...chat.toJSON(),
            latestMessage,
            unreadCount,
          };
        })
      );

      // Connect user to all their chat rooms
      chatService.handleUserConnect(
        userId,
        chats.map((chat) => chat._id)
      );

      res.json({
        status: 'success',
        data: chatsWithMessages,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }

  // Get a specific chat by ID
  // Get a specific chat with messages
  async getChatById(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user._id;
      const { page = 1, limit = 20 } = req.query;

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

      // Get messages for this chat with pagination
      const messages = await Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('sender', 'name avatar');

      // Get total messages count
      const totalMessages = await Message.countDocuments({ chat: chatId });

      // Get unread messages count
      const unreadCount = await Message.countDocuments({
        chat: chatId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId },
      });

      res.json({
        status: 'success',
        data: {
          chat: chat.toJSON(),
          messages,
          unreadCount,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalMessages,
            pages: Math.ceil(totalMessages / limit),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  }
  //   async getChatById(req, res) {
  //     try {
  //       const { chatId } = req.params;
  //       const userId = req.user._id;

  //       const chat = await ChatModel.findOne({
  //         _id: chatId,
  //         participants: userId,
  //       })
  //         .populate('participants', 'name email avatar')
  //         .populate('property', 'title photos');

  //       if (!chat) {
  //         return res.status(404).json({
  //           status: 'error',
  //           message: 'Chat not found or unauthorized',
  //         });
  //       }

  //       res.json({
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

      const totalMessages = await Message.countDocuments({ chat: chatId });

      // Mark messages as read
      await Message.updateMany(
        {
          chat: chatId,
          sender: { $ne: userId },
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
        data: {
          messages,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalMessages,
            pages: Math.ceil(totalMessages / limit),
          },
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
      console.log(req.body);

      // Validate both users exist
      if (!recipientId) {
        return res.status(400).json({
          status: 'error',
          message: 'Recipient ID is required',
        });
      }
      // Create chat using chat service
      const chat = await chatService.createChat(
        userId,
        recipientId,
        propertyId
      );
      console.log(chat);

      // Join participants to chat room
      chatService.handleJoinChat(chat._id, [userId, recipientId]);

      res.status(201).json({
        status: 'success',
        data: chat,
      });
    } catch (error) {
      console.error('Chat creation error:', error);
      res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to create chat',
      });
    }
  }

  // In ChatController class
  async sendMessage(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user._id;
      const { content, attachments } = req.body;

      // Validate input
      if (!content && (!attachments || attachments.length === 0)) {
        return res.status(400).json({
          status: 'error',
          message: 'Message content or attachments required',
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

      // Send message using chat service
      const message = await chatService.sendMessage(chatId, userId, {
        content,
        attachments,
      });

      // Emit message to all participants
      //   chatService.io.to(`chat_${chatId}`).emit('new_message', {
      //     chatId,
      //     message,
      //   });

      res.status(201).json({
        status: 'success',
        data: message,
      });
    } catch (error) {
      console.log(error);
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
