// import Conversation from '../../models/conversation.model.js';
// import Message from '../../models/message.model.js';
// import HttpException from '../../utils/exception.js';
// import { SocketService } from '../chat/socket.service.js';

// class ConversationService {
//   constructor(socketService) {
//     if (!socketService) {
//       throw new Error('SocketService is required for ConversationService');
//     }
//     this.socketService = socketService;
//   }

//   async createConversation(participants, metadata = {}) {
//     try {
//       // Check for existing conversation
//       const existingConversation = await Conversation.findOne({
//         participants: {
//           $all: participants,
//           $size: participants.length,
//         },
//       });

//       if (existingConversation) {
//         return existingConversation;
//       }

//       const conversation = new Conversation({
//         participants,
//         ...metadata,
//       });

//       await conversation.save();
//       return conversation;
//     } catch (error) {
//       throw new HttpException(500, 'Error creating conversation');
//     }
//   }

//   async sendMessage(senderId, conversationId, content, attachments = []) {
//     try {
//       console.log(
//         `📩 New message from ${senderId} in conversation ${conversationId}`
//       );
//       console.log(`📝 Message content: ${content}`);

//       const conversation = await Conversation.findById(conversationId);
//       if (!conversation) {
//         console.error('❌ Conversation not found');
//         throw new HttpException(404, 'Conversation not found');
//       }

//       // Check if sender is part of the conversation
//       if (!conversation.participants.includes(senderId)) {
//         console.error('❌ Unauthorized to send message');
//         throw new HttpException(403, 'Unauthorized to send message');
//       }

//       const message = new Message({
//         conversation: conversationId,
//         sender: senderId,
//         content,
//         attachments,
//       });

//       await message.save();
//       console.log(`✅ Message saved with ID: ${message._id}`);

//       // Update conversation's last message
//       conversation.lastMessage = message._id;

//       // Update unread counts
//       conversation.unreadCounts.set(senderId.toString(), 0);
//       conversation.participants.forEach((participantId) => {
//         if (participantId.toString() !== senderId.toString()) {
//           const currentCount =
//             conversation.unreadCounts.get(participantId.toString()) || 0;
//           conversation.unreadCounts.set(
//             participantId.toString(),
//             currentCount + 1
//           );
//         }
//       });

//       await conversation.save();

//       // Notify other participants via socket
//       if (!this.socketService) {
//         throw new Error('SocketService not initialized');
//       }

//       // Get socket instance if using singleton pattern
//       const socketService =
//         this.socketService instanceof SocketService
//           ? this.socketService
//           : SocketService.getInstance();

//       if (!socketService) {
//         throw new Error('Could not get SocketService instance');
//       }
//       console.log(`🔔 Notifying participants...`);

//       const otherParticipants = conversation.participants.filter(
//         (id) => id.toString() !== senderId.toString()
//       );

//       otherParticipants.forEach((participantId) => {
//         console.log(participantId);
//         socketService.notifyUser(participantId, 'new_message', {
//           conversationId,
//           message,
//           sender: senderId,
//         });
//       });

//       return message;
//     } catch (error) {
//       console.error('❌ Error sending message:', error);
//       throw new HttpException(500, 'Error sending message');
//     }
//   }

//   async getConversations(userId, options = {}) {
//     const { page = 1, limit = 20, status = 'active' } = options;

//     try {
//       const conversations = await Conversation.find({
//         participants: userId,
//         status,
//       })
//         .populate('participants', 'name photo')
//         .populate({
//           path: 'lastMessage',
//           // select: 'title location rules photo guests owner', // Only fetch specific fields for property
//           populate: {
//             path: 'sender',
//             //   select: 'name email phoneNumber', // Only fetch selected fields for owner
//           },
//         })
//         // .populate('lastMessage')
//         .sort({ updatedAt: -1 })
//         .skip((page - 1) * limit)
//         .limit(limit);

//       return conversations;
//     } catch (error) {
//       throw new HttpException(500, 'Error fetching conversations');
//     }
//   }

//   async getConversationMessages(conversationId, userId, options = {}) {
//     const { page = 1, limit = 50 } = options;

//     try {
//       const conversation = await Conversation.findById(conversationId);

//       if (!conversation) {
//         throw new HttpException(404, 'Conversation not found');
//       }

//       // Validate user is part of conversation
//       if (!conversation.participants.includes(userId)) {
//         throw new HttpException(403, 'Unauthorized to view messages');
//       }

//       const messages = await Message.find({
//         conversation: conversationId,
//         deletedFor: { $ne: userId },
//       })
//         .sort({ createdAt: -1 })
//         .skip((page - 1) * limit)
//         .limit(limit)
//         .populate('sender', 'name photo');

//       // Mark messages as read for this user
//       await Message.updateMany(
//         {
//           conversation: conversationId,
//           'readBy.user': { $ne: userId },
//         },
//         {
//           $push: {
//             readBy: {
//               user: userId,
//               readAt: new Date(),
//             },
//           },
//         }
//       );

//       // Reset unread count for this conversation
//       conversation.unreadCounts.set(userId.toString(), 0);
//       await conversation.save();

//       return messages;
//     } catch (error) {
//       throw new HttpException(500, 'Error fetching messages');
//     }
//   }

//   async archiveConversation(conversationId, userId) {
//     try {
//       const conversation = await Conversation.findById(conversationId);

//       if (!conversation) {
//         throw new HttpException(404, 'Conversation not found');
//       }

//       if (!conversation.participants.includes(userId)) {
//         throw new HttpException(403, 'Unauthorized to archive conversation');
//       }

//       conversation.status = 'archived';
//       await conversation.save();

//       return conversation;
//     } catch (error) {
//       throw new HttpException(500, 'Error archiving conversation');
//     }
//   }
// }

// export default ConversationService;

// services/conversation/conversation.service.js
import Conversation from '../../models/conversation.model.js';
import Message from '../../models/message.model.js';
import HttpException from '../../utils/exception.js';
import { SocketService } from '../chat/socket.service.js';
import UserModel from '../../models/user.model.js';

class ConversationService {
  constructor(socketService) {
    if (!socketService) {
      throw new Error('SocketService is required for ConversationService');
    }
    this.socketService = socketService;
  }

  async createConversation(participants, metadata = {}) {
    try {
      // Check for existing conversation with same participants and booking
      const existingConversation = await Conversation.findOne({
        participants: {
          $all: participants,
          $size: participants.length,
        },
        ...(metadata.booking ? { booking: metadata.booking } : {}),
      });

      if (existingConversation) {
        return existingConversation;
      }

      const conversation = new Conversation({
        participants,
        ...metadata,
        unreadCounts: new Map(), // Initialize as Map
      });

      await conversation.save();

      // Add conversation to users' inboxes
      await UserModel.updateMany(
        { _id: { $in: participants } },
        { $addToSet: { inbox: conversation._id } }
      );

      return conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new HttpException(
        500,
        'Error creating conversation: ' + error.message
      );
    }
  }
  async sendMessage(senderId, conversationId, content, attachments = []) {
    try {
      // const { conversationId } = req.params;
      // const { content, attachments, tempId } = req.body;
      // const userId = req.user._id;

      console.log(
        `📩 HTTP API message: ${content} from ${userId} in conversation ${conversationId}`
      );

      // Validate conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }

      // Check if sender is part of the conversation
      if (
        !conversation.participants.some(
          (p) => p.toString() === userId.toString()
        )
      ) {
        return res
          .status(403)
          .json({ message: 'Unauthorized to send message' });
      }

      // IMPORTANT: Check for recent duplicate message
      const recentMessage = await MessageModel.findOne({
        conversation: conversationId,
        sender: userId,
        content: content,
        createdAt: { $gte: new Date(Date.now() - 5000) },
      });

      let message;

      if (recentMessage) {
        console.log(
          `✅ Found duplicate message (${recentMessage._id}), reusing instead of creating new one`
        );
        message = recentMessage;
      } else {
        // Create new message if no duplicate exists
        message = new MessageModel({
          conversation: conversationId,
          sender: userId,
          content,
          attachments: attachments || [],
          status: 'SENT',
        });

        await message.save();
        console.log(`✅ New message created with ID: ${message._id}`);

        // Update conversation with last message
        conversation.lastMessage = message._id;

        // Update unread counts
        conversation.unreadCounts.set(userId.toString(), 0);
        conversation.participants.forEach((participantId) => {
          if (participantId.toString() !== userId.toString()) {
            const currentCount =
              conversation.unreadCounts.get(participantId.toString()) || 0;
            conversation.unreadCounts.set(
              participantId.toString(),
              currentCount + 1
            );
          }
        });

        await conversation.save();
      }

      // Populate message with sender details
      const populatedMessage = await MessageModel.findById(message._id)
        .populate({
          path: 'sender',
          select: 'name email profile.photo',
        })
        .exec();

      // Get socket instance to notify other participants
      const socketService = SocketService.getInstance();
      if (socketService) {
        // Notify other participants via socket
        const otherParticipants = conversation.participants.filter(
          (p) => p.toString() !== userId.toString()
        );

        otherParticipants.forEach((participantId) => {
          socketService.notifyUser(participantId.toString(), 'new_message', {
            message: populatedMessage,
            conversationId,
          });
        });

        // Also emit message_sent to the sender if they're connected via socket
        const senderSocketId = socketService.connectedUsers.get(
          userId.toString()
        );
        if (senderSocketId) {
          socketService.io.to(senderSocketId).emit('message_sent', {
            messageId: message._id,
            conversationId,
            message: populatedMessage,
            tempId: tempId, // Return tempId if provided
          });
        }
      }

      return populatedMessage;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  // async sendMessage(senderId, conversationId, content, attachments = []) {
  //   try {
  //     console.log(
  //       `📩 New message from ${senderId} in conversation ${conversationId}`
  //     );
  //     console.log(`📝 Message content: ${content}`);

  //     const conversation = await Conversation.findById(conversationId);
  //     if (!conversation) {
  //       console.error('❌ Conversation not found');
  //       throw new HttpException(404, 'Conversation not found');
  //     }

  //     // Check if sender is part of the conversation
  //     if (!conversation.participants.includes(senderId)) {
  //       console.error('❌ Unauthorized to send message');
  //       throw new HttpException(403, 'Unauthorized to send message');
  //     }

  //     const message = new Message({
  //       conversation: conversationId,
  //       sender: senderId,
  //       content,
  //       attachments: attachments || [],
  //       status: 'SENT',
  //     });

  //     await message.save();
  //     console.log(`✅ Message saved with ID: ${message._id}`);

  //     // Update conversation's last message
  //     conversation.lastMessage = message._id;

  //     // Update unread counts - reset for sender, increment for others
  //     conversation.unreadCounts.set(senderId.toString(), 0);
  //     conversation.participants.forEach((participantId) => {
  //       if (participantId.toString() !== senderId.toString()) {
  //         const currentCount =
  //           conversation.unreadCounts.get(participantId.toString()) || 0;
  //         conversation.unreadCounts.set(
  //           participantId.toString(),
  //           currentCount + 1
  //         );
  //       }
  //     });

  //     await conversation.save();

  //     // Get socket instance
  //     const socketService =
  //       this.socketService instanceof SocketService
  //         ? this.socketService
  //         : SocketService.getInstance();

  //     if (!socketService) {
  //       throw new Error('Could not get SocketService instance');
  //     }

  //     console.log(`🔔 Notifying participants...`);

  //     // Populate message with sender details for real-time updates
  //     const populatedMessage = await Message.findById(message._id).populate({
  //       path: 'sender',
  //       select: 'name profile.photo email',
  //     });

  //     // Notify other participants via socket
  //     const otherParticipants = conversation.participants.filter(
  //       (id) => id.toString() !== senderId.toString()
  //     );

  //     otherParticipants.forEach((participantId) => {
  //       socketService.notifyUser(participantId.toString(), 'new_message', {
  //         conversationId,
  //         message: populatedMessage,
  //       });
  //     });

  //     return populatedMessage;
  //   } catch (error) {
  //     console.error('❌ Error sending message:', error);
  //     throw new HttpException(500, 'Error sending message: ' + error.message);
  //   }
  // }

  async getConversations(userId, options = {}) {
    const { page = 1, limit = 20, status = 'active' } = options;
    const skip = (page - 1) * limit;

    try {
      // Find all conversations for this user with proper population
      const conversations = await Conversation.find({
        participants: userId,
        status,
      })
        .populate('participants', 'name profile.photo email')
        .populate({
          path: 'property',
          select: 'title location price photo rules guests bedrooms',
        })
        .populate({
          path: 'booking',
          select: 'checkIn checkOut totalAmount status',
        })
        .populate({
          path: 'lastMessage',
          populate: {
            path: 'sender',
            select: 'name profile.photo email',
          },
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get total count for pagination
      const total = await Conversation.countDocuments({
        participants: userId,
        status,
      });

      return {
        conversations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw new HttpException(
        500,
        'Error fetching conversations: ' + error.message
      );
    }
  }

  async getConversationMessages(conversationId, userId, options = {}) {
    console.log('userId', userId);
    console.log('conversationId', conversationId);
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    try {
      const conversation = await Conversation.findById(conversationId)
        .populate('participants', 'name profile.photo email')
        .populate('property')
        .populate({
          path: 'booking',
          select: 'checkIn checkOut status',
        });

      console.log(conversation.participants);
      if (!conversation) {
        throw new HttpException(404, 'Conversation not found');
      }

      // Validate user is part of conversation
      if (
        !conversation.participants.some(
          (p) => p._id.toString() === userId.toString()
        )
      ) {
        throw new HttpException(403, 'Unauthorized to view messages');
      }

      // Get messages with pagination
      const messages = await Message.find({
        conversation: conversationId,
        deletedFor: { $ne: userId },
      })
        .sort({ createdAt: -1 }) // Newest first
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'sender',
          select: 'name profile.photo email',
        });

      // Mark messages as read for this user
      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: userId },
          'readBy.user': { $ne: userId },
        },
        {
          $addToSet: {
            readBy: {
              user: userId,
              readAt: new Date(),
            },
          },
          $set: { status: 'READ' },
        }
      );

      // Reset unread count for this conversation
      conversation.unreadCounts.set(userId.toString(), 0);
      await conversation.save();

      // Get total count for pagination
      const total = await Message.countDocuments({
        conversation: conversationId,
        deletedFor: { $ne: userId },
      });

      return {
        messages,
        conversation,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new HttpException(500, 'Error fetching messages: ' + error.message);
    }
  }

  async archiveConversation(conversationId, userId) {
    try {
      const conversation = await Conversation.findById(conversationId);

      if (!conversation) {
        throw new HttpException(404, 'Conversation not found');
      }

      if (!conversation.participants.includes(userId)) {
        throw new HttpException(403, 'Unauthorized to archive conversation');
      }

      conversation.status = 'archived';
      await conversation.save();

      return conversation;
    } catch (error) {
      console.error('Error archiving conversation:', error);
      throw new HttpException(
        500,
        'Error archiving conversation: ' + error.message
      );
    }
  }
}

export default ConversationService;
