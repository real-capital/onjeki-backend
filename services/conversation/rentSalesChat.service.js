// services/rentSalesChat.service.js
import RentSalesConversation from '../../models/rentSalesConversation.model.js';
import RentSalesMessage from '../../models/rentSalesMessage.model.js';
import UserModel from '../../models/user.model.js';
import RentAndSales from '../../models/rentAndSales.model.js';
import { StatusCodes } from 'http-status-codes';
import HttpException from '../../utils/exception.js';
import NotificationService from '../notification/notification.service.js';
import { SocketService } from '../chat/socket.service.js';

class RentSalesChatService {
  constructor() {
    this.socketService = SocketService.getInstance();
  }

  async startConversation(userId, propertyId, initialMessage) {
    try {
      // Verify the property exists
      const property = await RentAndSales.findById(propertyId);
      if (!property) {
        throw new HttpException(StatusCodes.NOT_FOUND, 'Property not found');
      }

      const ownerId = property.owner.toString();

      // Check if user is trying to message themselves
      if (userId.toString() === ownerId) {
        throw new HttpException(
          StatusCodes.BAD_REQUEST,
          'You cannot start a conversation with yourself'
        );
      }

      // Check if a conversation already exists
      const existingConversation = await RentSalesConversation.findOne({
        participants: { $all: [userId, ownerId] },
        property: propertyId,
      });

      const socketService = SocketService.getInstance();
      if (existingConversation) {
        // Add a new message to the existing conversation
        const message = new RentSalesMessage({
          conversation: existingConversation._id,
          sender: userId,
          content: initialMessage,
          status: 'SENT',
        });

        await message.save();

        // Update last message and unread counts
        existingConversation.lastMessage = message._id;

        // Update unread counts for owner
        const currentCount =
          existingConversation.unreadCounts.get(ownerId) || 0;
        existingConversation.unreadCounts.set(ownerId, currentCount + 1);

        await existingConversation.save();

        // Populate message with sender details
        const populatedMessage = await RentSalesMessage.findById(
          message._id
        ).populate({
          path: 'sender',
          select: 'name email profile.photo',
        });

        // Notify the property owner via socket if they're online
        if (socketService) {
          socketService.notifyUser(ownerId, 'rent_sales_new_message', {
            message: populatedMessage,
            conversationId: existingConversation._id,
          });
        }

        // Send notification
        await this.sendNotification(ownerId, userId, initialMessage, property);

        return {
          conversation: existingConversation,
          message: populatedMessage,
        };
      }

      // Create a new conversation
      const newConversation = new RentSalesConversation({
        participants: [userId, ownerId],
        property: propertyId,
        unreadCounts: new Map([[ownerId, 1]]),
        status: 'active',
      });

      await newConversation.save();

      // Create the first message
      const message = new RentSalesMessage({
        conversation: newConversation._id,
        sender: userId,
        content: initialMessage,
        status: 'SENT',
      });

      await message.save();

      // Update conversation with first message
      newConversation.lastMessage = message._id;
      await newConversation.save();

      // Add the conversation to both users' rentSalesInbox
      await UserModel.updateMany(
        { _id: { $in: [userId, ownerId] } },
        { $addToSet: { rentSalesInbox: newConversation._id } }
      );

      // Populate message with sender details
      const populatedMessage = await RentSalesMessage.findById(
        message._id
      ).populate({
        path: 'sender',
        select: 'name email profile.photo',
      });

      // Notify the property owner via socket
      if (socketService) {
        socketService.notifyUser(ownerId, 'rent_sales_new_message', {
          message: populatedMessage,
          conversationId: newConversation._id,
        });
      }

      // Send notification
      await this.sendNotification(ownerId, userId, initialMessage, property);

      return {
        conversation: newConversation,
        message: populatedMessage,
      };
    } catch (error) {
      console.error('Error starting rent/sales conversation:', error);
      throw error;
    }
  }

  async getUserConversations(userId, page = 1, limit = 20, role = 'user') {
    try {
      const skip = (page - 1) * limit;

      let query = {
        participants: userId,
        status: 'active',
      };

      if (role === 'user') {
        query['$expr'] = { $ne: ['$property.owner', userId] };
      } else if (role === 'host') {
        query['$expr'] = { $eq: ['$property.owner', userId] };
      }

      // Find all rent/sales conversations for this user
      const conversations = await RentSalesConversation.find(query)
        .populate('participants', 'name email profile.photo')
        .populate({
          path: 'property',
          select: 'title photo.images price location type status',
          model: 'RentAndSales',
        })
        .populate({
          path: 'lastMessage',
          populate: {
            path: 'sender',
            select: 'name email profile.photo',
          },
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await RentSalesConversation.countDocuments({
        participants: userId,
        status: 'active',
      });

      return {
        conversations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting rent/sales conversations:', error);
      throw error;
    }
  }

  async getConversationMessages(conversationId, userId, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;

      // Verify conversation exists and user is a participant
      const conversation = await RentSalesConversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (!conversation) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Conversation not found or you are not a participant'
        );
      }

      // Reset unread count for this user
      if (conversation.unreadCounts.get(userId) > 0) {
        conversation.unreadCounts.set(userId, 0);
        await conversation.save();
      }

      // Get messages with pagination
      const messages = await RentSalesMessage.find({
        conversation: conversationId,
        deletedFor: { $ne: userId },
      })
        .populate('sender', 'name email profile.photo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Get total for pagination
      const total = await RentSalesMessage.countDocuments({
        conversation: conversationId,
        deletedFor: { $ne: userId },
      });

      // Mark messages as read
      await RentSalesMessage.updateMany(
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

      return {
        messages: messages.reverse(), // Return in chronological order
        conversation: await RentSalesConversation.findById(conversationId)
          .populate('participants', 'name email profile.photo')
          .populate('property', 'title photo price location type status'),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      throw error;
    }
  }

  async sendMessage(conversationId, userId, content, attachments = []) {
    try {
      // Verify conversation exists and user is a participant
      const conversation = await RentSalesConversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (!conversation) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Conversation not found or you are not a participant'
        );
      }
      // IMPORTANT: Check for recent duplicate message
      const recentMessage = await RentSalesMessage.findOne({
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
        // Create new message
        message = new RentSalesMessage({
          conversation: conversationId,
          sender: userId,
          content,
          attachments,
          status: 'SENT',
        });

        await message.save();
        // Update conversation's last message and unread counts
        conversation.lastMessage = message._id;
        conversation.unreadCounts.set(userId.toString(), 0);
        // Update unread counts for all participants except sender
        for (const participantId of conversation.participants) {
          if (participantId.toString() !== userId.toString()) {
            const currentCount =
              conversation.unreadCounts.get(participantId.toString()) || 0;
            conversation.unreadCounts.set(
              participantId.toString(),
              currentCount + 1
            );
          }
        }

        await conversation.save();
      }

      // Populate message for response
      const populatedMessage = await RentSalesMessage.findById(
        message._id
      ).populate('sender', 'name email profile.photo');

      const socketService = SocketService.getInstance();
      if (socketService) {
        // Notify other participants via socket
        const otherParticipants = conversation.participants.filter(
          (p) => p.toString() !== userId.toString()
        );

        otherParticipants.forEach((participantId) => {
          if (socketService) {
            socketService.notifyUser(
              participantId.toString(),
              'rent_sales_new_message',
              {
                message: populatedMessage,
                conversationId: conversation._id,
              }
            );
          }
        });
        // Also emit message_sent to the sender if they're connected via socket
        const senderSocketId = socketService.connectedUsers.get(
          userId.toString()
        );
        if (senderSocketId) {
          socketService.io.to(senderSocketId).emit('rent_sales_message_sent', {
            messageId: message._id,
            conversationId,
            message: populatedMessage,
            tempId: tempId, // Return tempId if provided
          });
        }

        // Get property and sender for notifications
        // const property = await RentAndSales.findById(
        //   conversation.property,
        //   'title'
        // );

        // // Send notifications to other participants
        // for (const participantId of otherParticipants) {
        //   await this.sendNotification(
        //     participantId.toString(),
        //     userId,
        //     content,
        //     property
        //   );
        // }
      }

      return populatedMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markMessageAsRead(messageId, conversationId, userId) {
    try {
      // Verify user is participant in conversation
      const conversation = await RentSalesConversation.findOne({
        _id: conversationId,
        participants: userId,
      });

      if (!conversation) {
        throw new HttpException(
          StatusCodes.NOT_FOUND,
          'Conversation not found or you are not a participant'
        );
      }

      // Mark message as read
      const message = await RentSalesMessage.findOneAndUpdate(
        {
          _id: messageId,
          conversation: conversationId,
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
        },
        { new: true }
      );

      if (!message) {
        return { alreadyRead: true };
      }
      const socketService = SocketService.getInstance();
      // Reset unread count for this user
      if (conversation.unreadCounts.get(userId) > 0) {
        conversation.unreadCounts.set(userId, 0);
        await conversation.save();
      }

      // Notify sender that message was read
      if (socketService) {
        socketService.notifyUser(
          message.sender.toString(),
          'rent_sales_message_read',
          {
            messageId,
            readBy: userId,
            conversationId,
          }
        );
      }

      return { success: true, message };
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  // Function to send notifications (push and email)
  async sendNotification(recipientId, senderId, messageContent, property) {
    try {
      if (!property) return;

      const propertyTitle = property.title;

      // Get sender and recipient info
      const sender = await UserModel.findById(senderId);
      const recipient = await UserModel.findById(recipientId);

      if (!sender || !recipient) return;

      // Send push notification if you have a notification service
      try {
        await NotificationService.sendPushNotification({
          userId: recipientId,
          title: `New message about ${propertyTitle}`,
          body: `${sender.name}: ${messageContent.substring(0, 50)}${
            messageContent.length > 50 ? '...' : ''
          }`,
          data: {
            type: 'rent_sales_chat',
            propertyId: property._id.toString(),
          },
        });
      } catch (error) {
        console.error('Error sending push notification:', error);
      }

      // Send email notification if you have an email service
      // Implementation will depend on your email service
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }
}

export default RentSalesChatService;
