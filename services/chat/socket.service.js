import { Server } from 'socket.io';
import { logger } from '../../utils/logger.js';

import UserModel from '../../models/user.model.js';
import ConversationModel from '../../models/conversation.model.js';
import MessageModel from '../../models/message.model.js';
import jwt from 'jsonwebtoken';
import NotificationService from '../notification/notification.service.js';

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

    // this.userSockets = new Map();
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

        // ✅ DEBUGGING: Ensure user is added to connectedUsers
        console.log(`🔹 User authenticated: ${user._id}`);

        this.connectedUsers.set(user._id.toString(), socket.id);
        console.log(`✅ Connected users after login:`, this.connectedUsers);

        next();
      } catch (error) {
        logger.error(`❌ Socket authentication error: ${error.message}`);
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
      socket.on('user-join', (data) => {
        this.connectedUsers.set(data, socket.id);
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
    const userId = socket.user._id.toString();
    console.log(`User connected now: ${userId}`);

    // ✅ Add user to connectedUsers with socketId
    this.connectedUsers.set(userId, socket.id);
    console.log(`✅ Added to connectedUsers: ${userId} -> ${socket.id}`);

    // ✅ Join user's personal room
    socket.join(userId);

    //   // Typing events
    socket.on('typing', this.handleTypingEvent.bind(this, socket));
    // ✅ Listen for messages
    socket.on('send_message', this.handleMessageSend.bind(this, socket));
    // socket.on('send_message', (data) => {
    //   console.log(`📩 Message received from ${userId}:`, data);
    // });

    //   // Read receipts
    socket.on('mark_read', this.handleMessageRead.bind(this, socket));

    // ✅ Listen for disconnect
    socket.on('disconnect', () => {
      this.connectedUsers.delete(userId);
      console.log(`❌ User disconnected: ${userId}`);
    });
  }

  // handleAuthentication(socket) {
  //   console.log(`User connected now: ${socket.user._id}`);
  //   console.log(`User connected: ${socket.user._id}`);

  //   // ✅ Add user to `connectedUsers`
  //   this.connectedUsers.set(socket.user._id.toString(), socket.id);
  //   console.log(
  //     `✅ Added to connectedUsers: ${socket.user._id} -> ${socket.id}`
  //   );

  //   // Join user's personal room
  //   socket.join(socket.user._id.toString());

  //   // Typing events
  //   socket.on('typing', this.handleTypingEvent.bind(this, socket));

  //   // Message sending
  //   // socket.on('send_message', this.handleMessageSend.bind(this, socket));
  //   socket.on('send_message', (data) => {
  //     console.log(data);
  //   });

  //   // Read receipts
  //   socket.on('mark_read', this.handleMessageRead.bind(this, socket));

  //   socket.on('disconnect', () => {
  //     this.connectedUsers.delete(socket.user._id.toString());
  //     console.log(`User disconnected: ${socket.user._id}`);
  //   });
  // }
  handleDisconnect(socket) {
    if (socket.userId) {
      const connectedUsers = this.connectedUsers.get(socket.userId);
      if (connectedUsers) {
        connectedUsers.delete(socket.id);
        if (connectedUsers.size === 0) {
          this.connectedUsers.delete(socket.userId);
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
      // console.log('📩 Received message data:', data);

      const { conversationId, content, attachments } = data;
      const userId = socket.user._id.toString();

      // ✅ Validate conversation
      const conversation = await ConversationModel.findById(
        conversationId
      ).populate('participants');
      if (!conversation) throw new Error('Conversation not found');

      // ✅ Create new message
      const message = new MessageModel({
        conversation: conversationId,
        sender: userId,
        content,
        attachments: attachments || [],
        status: 'SENT',
      });

      await message.save();

      // ✅ Update conversation with last message
      conversation.lastMessage = message._id;
      // ✅ Ensure unreadCounts is updated correctly
      conversation.unreadCounts = this.updateUnreadCounts(conversation, userId); // Now a Map ✅

      console.log('📌 Updated unreadCounts:', conversation.unreadCounts); // Debugging

      await conversation.save();

      console.log('📌 Message ID:', message._id);

      // ✅ Populate sender details
      const populatedMessage = await MessageModel.findById(message._id)
        .populate({
          path: 'sender',
          model: 'User',
          select: 'name email profileImage',
        })
        .exec();

      // console.log('✅ Populated message:', populatedMessage);

      // ✅ Broadcast to conversation participants
      const otherParticipants = conversation.participants.filter(
        (p) => p._id.toString() !== userId
      );
      // console.log('📌 Other Participants:', otherParticipants);

      // ✅ Debug connected users
      console.log('🔍 Debug connectedUsers:', this.connectedUsers);

      otherParticipants.forEach((participant) => {
        const participantSocketId = this.connectedUsers.get(
          participant._id.toString()
        );
        console.log('participantSocketId:', participantSocketId);

        if (participantSocketId) {
          this.io
            .to(participantSocketId)
            .emit('new_message', { message: populatedMessage, conversationId });
        }
      });

      // ✅ Acknowledge message send
      socket.emit('message_sent', {
        messageId: message._id,
        sentAt: message.createdAt,
      });
    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('message_error', { error: error.message });
    }
  }
  updateUnreadCounts(conversation, senderId) {
    // Ensure unreadCounts is a Mongoose Map
    if (!(conversation.unreadCounts instanceof Map)) {
      conversation.unreadCounts = new Map();
    }

    conversation.participants.forEach((participant) => {
      if (participant._id.toString() !== senderId.toString()) {
        const currentCount =
          conversation.unreadCounts.get(participant._id.toString()) || 0;
        conversation.unreadCounts.set(
          participant._id.toString(),
          currentCount + 1
        );
      }
    });

    return conversation.unreadCounts; // ✅ Return a Map, not an object
  }

  async handleMessageRead(socket, data) {
    try {
      const { messageId, conversationId } = data;
      const userId = socket.user._id.toString();

      console.log(`📩 Read receipt received for message: ${messageId}`);
      console.log(`✅ Marking message ${messageId} as read in conversation ${conversationId}`);

      // ✅ Validate message existence
      const message = await MessageModel.findById(messageId);
      if (!message) {
        console.error('❌ Message not found');
        return socket.emit('message_error', { error: 'Message not found' });
      }
      // Prevent duplicate read receipts
      const alreadyRead = message.readBy.some(
        (entry) => entry.user.toString() === socket.user._id.toString()
      );
      // ✅ Validate conversation existence
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        console.error('❌ Conversation not found');
        return socket.emit('message_error', {
          error: 'Conversation not found',
        });
      }

      // ✅ Ensure user is a participant of the conversation
      if (!conversation.participants.some((p) => p.toString() === userId)) {
        console.error('❌ User is not part of the conversation');
        return socket.emit('message_error', { error: 'Unauthorized access' });
      }

      if (!alreadyRead) {
        // ✅ Mark message as read
        const updatedMessage = await MessageModel.findByIdAndUpdate(
          messageId,
          {
            $addToSet: {
              readBy: {
                user: userId,
                readAt: new Date(),
              },
            },
          },
          { new: true } // ✅ Return updated document
        ).populate({
          path: 'readBy.user',
          select: 'name email', // ✅ Populate read user details
        });

        console.log(`✅ Message marked as read by user: ${userId}`);

        // ✅ Reset unread count in conversation
        conversation.unreadCounts.set(userId, 0);
        await conversation.save();
        console.log(`📌 Unread count reset for user: ${userId}`);

        // ✅ Notify other participants
        socket.to(conversationId).emit('message_read', {
          messageId,
          userId: socket.user._id,
        });
        // socket.to(conversationId).emit('message_read', {
        //   messageId,
        //   userId,
        //   conversationId,
        // });

        // ✅ Send acknowledgment to the user
        socket.emit('message_read_success', {
          messageId,
          conversationId,
          readBy: updatedMessage.readBy,
        });
      }
    } catch (error) {
      console.error('❌ Read receipt error:', error);
      socket.emit('message_error', { error: 'Failed to mark message as read' });
    }
  }

  // async handleMessageSend(socket, data) {
  //   logger.info(data);
  //   console.log('data =======');
  //   console.log(data);
  //   try {
  //     const { conversationId, content, attachments } = data;

  //     // Validate conversation
  //     const conversation = await ConversationModel.findById(
  //       conversationId
  //     ).populate('participants');

  //     // console.log('conversation');
  //     // console.log(conversation);

  //     if (!conversation) {
  //       throw new Error('Conversation not found');
  //     }

  //     // Create message
  //     const message = new MessageModel({
  //       conversation: conversationId,
  //       sender: socket.user._id,
  //       content,
  //       attachments: attachments || [],
  //       status: 'SENT',
  //     });

  //     await message.save();
  //     // Update conversation
  //     conversation.lastMessage = message._id;
  //     console.log('message._id');
  //     console.log(conversation.lastMessage);
  //     conversation.unreadCounts = this.updateUnreadCounts(
  //       conversation,
  //       socket.user._id
  //     );
  //     await conversation.save();

  //     // ✅ Properly populate the sender details
  //     const populatedMessage = await MessageModel.findById(
  //       message._id
  //     ).populate(sender);

  //     console.log('✅ Message saved:', message._id);
  //     console.log('📌 Populated message:', populatedMessage);

  //     await populatedMessage.save();

  //     // Broadcast to conversation participants
  //     const otherParticipants = conversation.participants.filter(
  //       (p) => p._id.toString() !== socket.user._id.toString()
  //     );
  //     console.log(otherParticipants);

  //     otherParticipants.forEach((participant) => {
  //       const participantSocketId = this.connectedUsers.get(
  //         participant._id.toString()
  //       );

  //       console.log('participantSocketId');
  //       console.log(participantSocketId);

  //       if (participantSocketId) {
  //         // Send to specific user's room
  //         this.io.to(participant._id.toString()).emit('new_message', {
  //           message: populatedMessage,
  //           conversationId,
  //         });

  //         // Send push notification
  //         this.sendPushNotification(participant, populatedMessage);
  //       }
  //     });

  //     // Acknowledge message send
  //     socket.emit('message_sent', {
  //       messageId: message._id,
  //       sentAt: message.createdAt,
  //     });
  //   } catch (error) {
  //     socket.emit('message_error', {
  //       error: error.message,
  //     });
  //   }
  // }

  // updateUnreadCounts(conversation, senderId) {
  //   const unreadCounts = { ...conversation.unreadCounts };

  //   conversation.participants.forEach((participant) => {
  //     if (participant._id.toString() !== senderId.toString()) {
  //       unreadCounts[participant._id.toString()] =
  //         (unreadCounts[participant._id.toString()] || 0) + 1;
  //     }
  //   });

  //   return unreadCounts;
  // }

  // async handleMessageRead(socket, data) {
  //   const { messageId, conversationId } = data;

  //   try {
  //     // Mark message as read
  //     await MessageModel.findByIdAndUpdate(messageId, {
  //       $addToSet: {
  //         readBy: {
  //           user: socket.user._id,
  //           readAt: new Date(),
  //         },
  //       },
  //     });

  //     // Broadcast read receipt to other participants
  //     socket.to(conversationId).emit('message_read', {
  //       messageId,
  //       userId: socket.user._id,
  //     });
  //   } catch (error) {
  //     console.error('Read receipt error:', error);
  //   }
  // }

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
    console.log('🔔 Notifying user:', userId);
    const socketId = this.connectedUsers.get(userId);

    if (socketId) {
      this.io.to(socketId).emit(event, data);
      console.log(`✅ Notification sent to ${userId}:`, event);
    } else {
      console.log(`❌ User ${userId} is not online.`);
    }
  }

  // notifyUser(userId, event, data) {
  //   console.log('notifying');
  //   console.log(userId);
  //   const connectedUsers = this.connectedUsers.get(userId);
  //   console.log('connectedUsers');
  //   console.log(connectedUsers);
  //   if (connectedUsers) {
  //     connectedUsers.forEach((socketId) => {
  //       this.io.to(socketId).emit(event, data);
  //     });
  //     logger.debug(`Notification sent to user ${userId}: ${event}`);
  //   }
  // }

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
    const connectedUsers = this.connectedUsers.get(userId);
    console.log(connectedUsers);
    return connectedUsers != null && connectedUsers.size > 0;
  }

  getIO() {
    if (!this.io) {
      throw new Error('Socket.io not initialized');
    }
    return this.io;
  }
}
