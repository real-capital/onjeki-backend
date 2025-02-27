import ChatModel from '../../models/chat.model.js';
import Message from '../../models/message_model.js';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import RentOrSaleNotificationService from '../notification/rent-or-sale-notification.service.js';
class ChatService {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> socketId
  }

  // initialize() {
  //   this.io.on('connection', (socket) => {
  //     // Your existing socket handlers
  //     socket.on('user_connected', (userId) =>
  //       this.handleUserConnect(socket, userId)
  //     );
  //     socket.on('join_chat', (chatId) => this.handleJoinChat(socket, chatId));
  //     socket.on('leave_chat', (chatId) => this.handleLeaveChat(socket, chatId));
  //     socket.on('send_message', (data) => this.handleNewMessage(socket, data));
  //     socket.on('disconnect', () => this.handleDisconnect(socket));

  //     // Add new socket handlers
  //     socket.on('typing_start', (chatId) =>
  //       this.handleTypingStart(socket, chatId)
  //     );
  //     socket.on('typing_end', (chatId) => this.handleTypingEnd(socket, chatId));
  //     socket.on('mark_read', (data) => this.handleMarkRead(socket, data));
  //   });
  // }

  // // Add new methods for typing indicators
  // handleTypingStart(socket, chatId) {
  //   socket.to(`chat_${chatId}`).emit('typing_start', {
  //     userId: socket.userId,
  //     chatId,
  //   });
  // }

  // handleTypingEnd(socket, chatId) {
  //   socket.to(`chat_${chatId}`).emit('typing_end', {
  //     userId: socket.userId,
  //     chatId,
  //   });
  // }

  // Add method for marking messages as read

  initialize() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      socket.on('user_connected', (userId) => {
        console.log(`User ${userId} connected with socket ID: ${socket.id}`);
        this.handleUserConnect(socket, userId);
      });

      socket.on('join_chat', (chatId) => this.handleJoinChat(socket, chatId));
      socket.on('leave_chat', (chatId) => this.handleLeaveChat(socket, chatId));
      socket.on('send_message', (data) => this.handleNewMessage(socket, data));
      socket.on('disconnect', () => this.handleDisconnect(socket));

      // Updated typing event handlers
      socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing_end', (data) => this.handleTypingEnd(socket, data));
      socket.on('mark_read', (data) => this.handleMarkRead(socket, data));
    });
  }

  // ✅ Updated typing handlers that expect `userId` in `data`
  handleTypingStart(socket, data) {
    const { userId, chatId } = data;
    if (!userId || !chatId) {
      console.error(`Typing event ignored: Missing userId or chatId`);
      return;
    }
    console.log(`User ${userId} started typing in chat ${chatId}`);
    socket.to(`chat_${chatId}`).emit('typing_start', { userId, chatId });
  }

  handleTypingEnd(socket, data) {
    const { userId, chatId } = data;
    if (!userId || !chatId) {
      console.error(`Typing event ignored: Missing userId or chatId`);
      return;
    }
    console.log(`User ${userId} stopped typing in chat ${chatId}`);
    socket.to(`chat_${chatId}`).emit('typing_end', { userId, chatId });
  }

  async handleMarkRead(socket, { chatId, messageIds }) {
    try {
      await Message.updateMany(
        {
          _id: { $in: messageIds },
          chat: chatId,
          'readBy.user': { $ne: socket.userId },
        },
        {
          $push: {
            readBy: {
              user: socket.userId,
              readAt: new Date(),
            },
          },
          status: 'READ',
        }
      );

      this.io.to(`chat_${chatId}`).emit('messages_read', {
        chatId,
        messageIds,
        userId: socket.userId,
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  async handleUserConnect(socket, userId) {
    this.connectedUsers.set(userId, socket.id);
    socket.userId = userId;

    // Get user's active chats and join their rooms
    const activeChats = await ChatModel.find({
      participants: userId,
    });

    activeChats.forEach((chat) => {
      console.log(`user active ${chat.id}`);
      socket.join(`chat_${chat._id}`);
    });
  }

  handleJoinChat(socket, chatId) {
    console.log(`user joining ${chat.id}`);
    socket.join(`chat_${chatId}`);
  }

  handleLeaveChat(socket, chatId) {
    socket.leave(`chat_${chatId}`);
  }

  async handleNewMessage(socket, { chatId, message }) {
    try {
      const chat = await ChatModel.findById(chatId).populate(
        'participants',
        'name email fcmToken'
      );

      if (!chat) {
        throw new Error('Chat not found');
      }

      //   const newMessage = await this.sendMessage(chatId, socket.userId, message);

      // Save message to database
      const newMessage = await Message.create({
        chat: chatId,
        sender: socket.userId,
        content: message.content,
        attachments: message.attachments,
      });

      // Update chat's last message
      chat.lastMessage = {
        content: message.content,
        sender: socket.userId,
        createdAt: new Date(),
      };
      await chat.save();

      console.log(`emitting messages ${newMessage}`);
      // Emit message to all participants in the chat room
      this.io.to(`chat_${chatId}`).emit('new_message', {
        chatId,
        message: newMessage,
      });

      // Send notifications to offline participants
      const offlineParticipants = chat.participants.filter(
        (participant) =>
          participant._id.toString() !== socket.userId &&
          !this.connectedUsers.has(participant._id.toString())
      );

      await this.sendNotifications(offlineParticipants, chat, newMessage);
    } catch (error) {
      socket.emit('error', error.message);
    }
  }

  handleDisconnect(socket) {
    if (socket.userId) {
      this.connectedUsers.delete(socket.userId);
    }
  }

  // In ChatService class
  async sendMessage(chatId, senderId, messageData) {
    try {
      const chat = await ChatModel.findById(chatId).populate(
        'participants',
        'name email fcmToken'
      );

      if (!chat) {
        throw new Error('Chat not found');
      }

      // Create new message
      const newMessage = await Message.create({
        chat: chatId,
        sender: senderId,
        content: messageData.content,
        attachments: messageData.attachments || [],
      });

      // Update chat's last message
      chat.lastMessage = {
        content: messageData.content,
        sender: senderId,
        createdAt: new Date(),
      };
      await chat.save();

      // Populate sender information
      await newMessage.populate('sender', 'name email avatar');

      return newMessage;
    } catch (error) {
      throw error;
    }
  }

  async createChat(userId, recipientId, propertyId) {
    // // Check if chat already exists

    // Check if chat already exists
    let chat = await ChatModel.findOne({
      property: propertyId,
      participants: { $all: [userId, recipientId] },
    });

    if (chat) {
      return res.json({
        status: 'success',
        data: chat,
      });
    }

    // Create new chat
    // Create new chat with both participants
    chat = await ChatModel.create({
      property: propertyId,
      participants: [userId, recipientId], // Ensure both participants are included
      createdBy: userId,
    });
    console.log(chat);

    // Populate necessary fields
    await chat.populate([
      { path: 'participants', select: 'name email avatar' },
      { path: 'property', select: 'title photos' },
    ]);

    return chat;
  }

  // handleJoinChat(chatId, userIds) {
  //   userIds.forEach((userId) => {
  //     const socketId = this.connectedUsers.get(userId.toString());
  //     if (socketId) {
  //       const socket = this.io.sockets.sockets.get(socketId);
  //       if (socket) {
  //         socket.join(`chat_${chatId}`);
  //       }
  //     }
  //   });
  // }

  handleUserConnect(userId, chatIds) {
    const socketId = this.connectedUsers.get(userId.toString());
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        chatIds.forEach((chatId) => {
          socket.join(`chat_${chatId}`);
        });
      }
    }
  }

  async sendNotifications(recipients, chat, message) {
    const notificationService = new RentOrSaleNotificationService();

    for (const recipient of recipients) {
      // Send push notification if FCM token exists
      if (recipient.fcmToken) {
        await notificationService.sendPushNotification({
          token: recipient.fcmToken,
          title: `New message from ${message.sender.name}`,
          body: message.content,
          data: {
            type: 'chat_message',
            chatId: chat._id.toString(),
            propertyId: chat.property.toString(),
          },
        });
      }

      // Send email notification
      await notificationService.sendEmailNotification({
        to: recipient.email,
        subject: 'New Message Received',
        template: 'chat-notification',
        context: {
          recipientName: recipient.name,
          senderName: message.sender.name,
          propertyTitle: chat.property.title,
          messagePreview: message.content.substring(0, 100),
          chatLink: `${process.env.CLIENT_URL}/chats/${chat._id}`,
        },
      });
    }
  }
}

export default ChatService;
