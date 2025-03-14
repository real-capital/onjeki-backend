import { Server } from 'socket.io';
import { logger } from '../../utils/logger.js';

import UserModel from '../../models/user.model.js';
import MessageModel from '../../models/message_model.js';
import ConversationModel from '../../models/conversation_model.js';
import jwt from 'jsonwebtoken';

// services/socket.service.js
export class SocketService {
  static instance = null;

  constructor(server) {
    if (SocketService.instance) {
      return SocketService.instance;
    }

    if (!server) {
      throw new Error('HTTP Server is required to initialize SocketService');
    }

    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.userSockets = new Map();
    this.connectedUsers = new Map();
    this.initializeMiddleware();
    this.initialize();

    SocketService.instance = this;
  }

  static getInstance() {
    return SocketService.instance;
  }

  initializeMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
        const user = await UserModel.findById(decoded.id);
        if (!user) {
          return next(new Error('Authentication error'));
        }

        socket.user = user;
        this.connectedUsers.set(user._id.toString(), socket.id);
        next();
      } catch (error) {
        logger.error(`Socket authentication error: ${error.message}`);
        next(new Error('Authentication failed'));
      }
    });
  }

  initialize() {
    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      socket.on('authenticate', () => {
        this.handleAuthentication(socket);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error: ${error.message}`);
      });
    });
  }

  handleAuthentication(socket) {
    console.log(`User connected: ${socket.user._id}`);

    // Join user's personal room
    socket.join(socket.user._id.toString());

    // Typing events
    socket.on('typing', this.handleTypingEvent.bind(this, socket));

    // Message sending
    socket.on('send_message', this.handleMessageSend.bind(this, socket));

    // Read receipts
    socket.on('mark_read', this.handleMessageRead.bind(this, socket));

    socket.on('disconnect', () => {
      this.connectedUsers.delete(socket.user._id.toString());
      console.log(`User disconnected: ${socket.user._id}`);
    });
    // try {
    //   // Add socket to user's socket set
    //   if (!this.userSockets.has(userId)) {
    //     this.userSockets.set(userId, new Set());
    //   }
    //   this.userSockets.get(userId).add(socket.id);
    //   socket.userId = userId;

    //   // Join user-specific room
    //   socket.join(`user_${userId}`);

    //   logger.info(`User ${userId} authenticated on socket ${socket.id}`);
    // } catch (error) {
    //   logger.error(`Authentication error: ${error.message}`);
    //   socket.emit('auth_error', { message: 'Authentication failed' });
    // }
  }
  handleDisconnect(socket) {
    if (socket.userId) {
      const userSockets = this.userSockets.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(socket.userId);
        }
      }
    }
    logger.info(`Socket disconnected: ${socket.id}`);
  }

  async handleTypingEvent(socket, data) {
    const { conversationId, isTyping } = data;

    // Broadcast typing status to other participants
    socket.to(conversationId).emit('typing', {
      userId: socket.user._id,
      conversationId,
      isTyping,
    });
  }
  async handleMessageSend(socket, data) {
    try {
      const { conversationId, content, attachments } = data;

      // Validate conversation
      const conversation = await ConversationModel.findById(
        conversationId
      ).populate('participants');

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Create message
      const message = new MessageModel({
        conversation: conversationId,
        sender: socket.user._id,
        content,
        attachments: attachments || [],
        status: 'SENT',
      });

      await message.save();

      // Update conversation
      conversation.lastMessage = message._id;
      conversation.unreadCounts = this.updateUnreadCounts(
        conversation,
        socket.user._id
      );
      await conversation.save();

      // Prepare message for broadcasting
      const populatedMessage = await MessageModel.populate(message, [
        { path: 'sender', select: 'name email profileImage' },
      ]);

      // Broadcast to conversation participants
      const otherParticipants = conversation.participants.filter(
        (p) => p._id.toString() !== socket.user._id.toString()
      );

      otherParticipants.forEach((participant) => {
        const participantSocketId = this.connectedUsers.get(
          participant._id.toString()
        );

        if (participantSocketId) {
          // Send to specific user's room
          this.io.to(participant._id.toString()).emit('new_message', {
            message: populatedMessage,
            conversationId,
          });

          // Send push notification
          this.sendPushNotification(participant, populatedMessage);
        }
      });

      // Acknowledge message send
      socket.emit('message_sent', {
        messageId: message._id,
        sentAt: message.createdAt,
      });
    } catch (error) {
      socket.emit('message_error', {
        error: error.message,
      });
    }
  }

  updateUnreadCounts(conversation, senderId) {
    const unreadCounts = { ...conversation.unreadCounts };

    conversation.participants.forEach((participant) => {
      if (participant._id.toString() !== senderId.toString()) {
        unreadCounts[participant._id.toString()] =
          (unreadCounts[participant._id.toString()] || 0) + 1;
      }
    });

    return unreadCounts;
  }

  async handleMessageRead(socket, data) {
    const { messageId, conversationId } = data;

    try {
      // Mark message as read
      await MessageModel.findByIdAndUpdate(messageId, {
        $addToSet: {
          readBy: {
            user: socket.user._id,
            readAt: new Date(),
          },
        },
      });

      // Broadcast read receipt to other participants
      socket.to(conversationId).emit('message_read', {
        messageId,
        userId: socket.user._id,
      });
    } catch (error) {
      console.error('Read receipt error:', error);
    }
  }

  async sendPushNotification(recipient, message) {
    try {
      await NotificationService.sendPushNotification({
        userId: recipient._id,
        title: `New message from ${message.sender.name}`,
        body: message.content,
        data: {
          conversationId: message.conversation,
          messageId: message._id,
        },
      });
    } catch (error) {
      console.error('Push notification error:', error);
    }
  }

  // Utility methods for emitting events
  notifyUser(userId, event, data) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        this.io.to(socketId).emit(event, data);
      });
      logger.debug(`Notification sent to user ${userId}: ${event}`);
    }
  }

  notifyUsers(userIds, event, data) {
    userIds.forEach((userId) => {
      this.notifyUser(userId, event, data);
    });
  }

  notifyRoom(roomId, event, data) {
    this.io.to(roomId).emit(event, data);
  }

  broadcast(event, data) {
    this.io.emit(event, data);
  }

  isUserOnline(userId) {
    const userSockets = this.userSockets.get(userId);
    return userSockets != null && userSockets.size > 0;
  }

  getIO() {
    if (!this.io) {
      throw new Error('Socket.io not initialized');
    }
    return this.io;
  }
}
