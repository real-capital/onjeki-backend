import { Server } from 'socket.io';
import { logger } from '../../utils/logger.js';

import UserModel from '../../models/user.model.js';
import ConversationModel from '../../models/conversation.model.js';
import MessageModel from '../../models/message.model.js';
import jwt from 'jsonwebtoken';
import NotificationService from '../notification/notification.service.js';
import RentSalesMessage from '../../models/rentSalesMessage.model.js';
import RentSalesConversation from '../../models/rentSalesConversation.model.js';

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
        const userIdStr = user._id.toString();
        this.connectedUsers.set(userIdStr, socket.id);
        console.log(`User ${userIdStr} connected with socket ${socket.id}`);
        console.log(
          'Current connected users:',
          Array.from(this.connectedUsers.entries())
        );
        console.log(`✅ Connected users after login:`, this.connectedUsers);
        socket.join(user._id.toString());

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
      // When user enters a conversation
      socket.on('join_conversation', (conversationId) => {
        socket.join(conversationId);
        console.log(
          `📥 ${socket.user._id} joined conversation ${conversationId}`
        );
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

    socket.on(
      'rent_sales_send_message',
      this.handleRentSalesMessageSend.bind(this, socket)
    );
    socket.on(
      'rent_sales_typing',
      this.handleRentSalesTypingEvent.bind(this, socket)
    );
    socket.on(
      'rent_sales_mark_read',
      this.handleRentSalesMessageRead.bind(this, socket)
    );
    // ✅ Listen for disconnect
    socket.on('disconnect', () => {
      this.connectedUsers.delete(userId);
      console.log(`❌ User disconnected: ${userId}`);
    });
  }

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

    // ✅ Make sure socket joins this room first
    socket.join(conversationId);

    // Then broadcast typing to others
    socket.to(conversationId).emit('typing', {
      userId: socket.user._id,
      userName: socket.user.name, // 👈 Add this
      conversationId,
      isTyping,
    });

    console.log(
      `✍️ ${socket.user._id} isTyping=${isTyping} in ${conversationId}`
    );
  }

  async handleMessageSend(socket, data) {
    try {
      const { conversationId, content, attachments, tempId } = data;
      const userId = socket.user._id.toString();

      console.log(
        `📩 Socket message: ${content} from ${userId} in conversation ${conversationId}`
      );
      console.log(`With tempId: ${tempId || 'none'}`);

      // Validate conversation
      const conversation = await ConversationModel.findById(
        conversationId
      ).populate('participants');

      if (!conversation) throw new Error('Conversation not found');

      // IMPORTANT: Check for recent duplicate message (within last 5 seconds)
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

        // Update conversation's last message
        conversation.lastMessage = message._id;

        // Reset sender's unread count
        conversation.unreadCounts.set(userId, 0);

        // Increment recipient's unread count
        conversation.participants.forEach((participant) => {
          if (participant._id.toString() !== userId.toString()) {
            const currentCount =
              conversation.unreadCounts.get(participant._id.toString()) || 0;
            conversation.unreadCounts.set(
              participant._id.toString(),
              currentCount + 1
            );
          }
        });

        await conversation.save();
      }

      // Populate sender details
      const populatedMessage = await MessageModel.findById(message._id)
        .populate({
          path: 'sender',
          select: 'name email profile.photo',
        })
        .exec();

      // Broadcast to conversation participants
      const otherParticipants = conversation.participants.filter(
        (p) => p._id.toString() !== userId.toString()
      );

      // Send to other participants who are online
      otherParticipants.forEach((participant) => {
        const participantId = participant._id.toString();
        const participantSocketId = this.connectedUsers.get(participantId);

        if (participantSocketId) {
          console.log(
            `✉️ Sending message to online participant: ${participantId}`
          );
          this.io.to(participantSocketId).emit('new_message', {
            message: populatedMessage,
            conversationId,
          });
        } else {
          console.log(`📵 Participant not online: ${participantId}`);
          // Queue push notification or other offline delivery
        }
      });

      // Send confirmation to sender with tempId to link with optimistic message
      socket.emit('message_sent', {
        messageId: message._id,
        conversationId,
        message: populatedMessage,
        tempId: tempId, // Return the tempId to match with frontend
      });

      return populatedMessage;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('message_error', {
        error: error.message,
        tempId: data.tempId,
      });
      throw error;
    }
  }

  // async handleMessageSend(socket, data) {
  //   try {
  //     const { conversationId, content, attachments } = data;
  //     const userId = socket.user._id.toString();

  //     // ✅ Validate conversation
  //     const conversation = await ConversationModel.findById(
  //       conversationId
  //     ).populate('participants');

  //     if (!conversation) throw new Error('Conversation not found');

  //     // ✅ Create new message
  //     const message = new MessageModel({
  //       conversation: conversationId,
  //       sender: userId,
  //       content,
  //       attachments: attachments || [],
  //       status: 'SENT',
  //     });

  //     await message.save();

  //     // ✅ Update conversation with last message
  //     conversation.lastMessage = message._id;

  //     // Reset sender's unread count
  //     conversation.unreadCounts.set(userId, 0);

  //     // Increment recipient's unread count
  //     conversation.participants.forEach((participant) => {
  //       if (participant._id.toString() !== userId.toString()) {
  //         const currentCount =
  //           conversation.unreadCounts.get(participant._id.toString()) || 0;
  //         conversation.unreadCounts.set(
  //           participant._id.toString(),
  //           currentCount + 1
  //         );
  //       }
  //     });

  //     await conversation.save();

  //     // ✅ Populate sender details
  //     const populatedMessage = await MessageModel.findById(message._id)
  //       .populate({
  //         path: 'sender',
  //         select: 'name email profile.photo',
  //       })
  //       .exec();

  //     // ✅ Broadcast to conversation participants
  //     const otherParticipants = conversation.participants.filter(
  //       (p) => p._id.toString() !== userId.toString()
  //     );

  //     // Send to other participants who are online
  //     otherParticipants.forEach((participant) => {
  //       const participantId = participant._id.toString();
  //       console.log('Looking for participant:', participantId);
  //       const participantSocketId = this.connectedUsers.get(participantId);
  //       console.log('Found socket ID:', participantSocketId);

  //       if (participantSocketId) {
  //         console.log(`Sending message to online participant: ${participantId}`);
  //         this.io.to(participantSocketId).emit('new_message', {
  //           message: populatedMessage,
  //           conversationId,
  //         });
  //       } else {
  //         console.log(`Participant not online: ${participantId}`);
  //         // Optional: queue push notification or other offline delivery
  //       }
  //     });

  //     // Always send confirmation to sender (outside the loop)
  //     socket.emit('message_sent', {
  //       messageId: message._id,
  //       conversationId,
  //       // message: populatedMessage,
  //     });

  //     return populatedMessage; // Return the created message
  //   } catch (error) {
  //     console.error('❌ Error sending message:', error);
  //     socket.emit('message_error', { error: error.message });
  //     throw error; // Re-throw to allow handling at a higher level
  //   }
  // }

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

      const message = await MessageModel.findById(messageId);
      if (!message) {
        console.error('❌ Message not found');
        return socket.emit('message_error', { error: 'Message not found' });
      }

      const alreadyRead = message.readBy.some(
        (entry) => entry.user.toString() === userId.toString()
      );
      // ✅ Validate conversation existence
      const conversation = await ConversationModel.findById(conversationId);
      if (!conversation) {
        console.error('❌ Conversation not found');
        return socket.emit('message_error', {
          error: 'Conversation not found',
        });
      }
      if (
        !conversation.participants.some(
          (p) => p.toString() === userId.toString()
        )
      ) {
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
            $set: { status: 'READ' },
          },
          { new: true }
        ).populate({
          path: 'readBy.user',
          select: 'name email profile.photo',
        });

        console.log(`✅ Message marked as read by user: ${userId}`);

        conversation.unreadCounts.set(userId, 0);
        await conversation.save();
        console.log(`📌 Unread count reset for user: ${userId}`);

        socket.to(conversationId).emit('message_read', {
          messageId,
          userId: socket.user._id,
          conversationId,
        });

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

  // async handleMessageRead(socket, data) {
  //   try {
  //     const { messageId, conversationId } = data;
  //     const userId = socket.user._id.toString();

  //     console.log(`📩 Read receipt received for message: ${messageId}`);
  //     console.log(
  //       `✅ Marking message ${messageId} as read in conversation ${conversationId}`
  //     );

  //     // ✅ Validate message existence
  //     const message = await MessageModel.findById(messageId);
  //     if (!message) {
  //       console.error('❌ Message not found');
  //       return socket.emit('message_error', { error: 'Message not found' });
  //     }
  //     // Prevent duplicate read receipts
  //     const alreadyRead = message.readBy.some(
  //       (entry) => entry.user.toString() === socket.user._id.toString()
  //     );
  //     // ✅ Validate conversation existence
  //     const conversation = await ConversationModel.findById(conversationId);
  //     if (!conversation) {
  //       console.error('❌ Conversation not found');
  //       return socket.emit('message_error', {
  //         error: 'Conversation not found',
  //       });
  //     }

  //     // ✅ Ensure user is a participant of the conversation
  //     if (!conversation.participants.some((p) => p.toString() === userId)) {
  //       console.error('❌ User is not part of the conversation');
  //       return socket.emit('message_error', { error: 'Unauthorized access' });
  //     }

  //     if (!alreadyRead) {
  //       // ✅ Mark message as read
  //       const updatedMessage = await MessageModel.findByIdAndUpdate(
  //         messageId,
  //         {
  //           $addToSet: {
  //             readBy: {
  //               user: userId,
  //               readAt: new Date(),
  //             },
  //           },
  //         },
  //         { new: true } // ✅ Return updated document
  //       ).populate({
  //         path: 'readBy.user',
  //         select: 'name email', // ✅ Populate read user details
  //       });

  //       console.log(`✅ Message marked as read by user: ${userId}`);

  //       // ✅ Reset unread count in conversation
  //       conversation.unreadCounts.set(userId, 0);
  //       await conversation.save();
  //       console.log(`📌 Unread count reset for user: ${userId}`);

  //       // ✅ Notify other participants
  //       socket.to(conversationId).emit('message_read', {
  //         messageId,
  //         userId: socket.user._id,
  //       });
  //       // socket.to(conversationId).emit('message_read', {
  //       //   messageId,
  //       //   userId,
  //       //   conversationId,
  //       // });

  //       // ✅ Send acknowledgment to the user
  //       socket.emit('message_read_success', {
  //         messageId,
  //         conversationId,
  //         readBy: updatedMessage.readBy,
  //       });
  //     }
  //   } catch (error) {
  //     console.error('❌ Read receipt error:', error);
  //     socket.emit('message_error', { error: 'Failed to mark message as read' });
  //   }
  // }

  async handleRentSalesMessageSend(socket, data) {
    try {
      const { conversationId, content, attachments, tempId } = data;
      const userId = socket.user._id.toString();
      console.log(
        `📩 Socket message: ${content} from ${userId} in conversation ${conversationId}`
      );
      console.log(`With tempId: ${tempId || 'none'}`);

      // Validate conversation
      const conversation = await RentSalesConversation.findById(
        conversationId
      ).populate('participants');

      if (!conversation) throw new Error('Conversation not found');

      // Create new message
      const recentMessage = await RentSalesMessage.findOne({
        conversation: conversationId,
        sender: userId,
        content,
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
        message = new RentSalesMessage({
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

        conversation.unreadCounts.set(userId, 0);

        // Update unread counts
        conversation.participants.forEach((participant) => {
          if (participant._id.toString() !== userId.toString()) {
            const currentCount =
              conversation.unreadCounts.get(participant._id.toString()) || 0;
            conversation.unreadCounts.set(
              participant._id.toString(),
              currentCount + 1
            );
          }
        });
        await conversation.save();
      }

      // Populate sender details
      const populatedMessage = await RentSalesMessage.findById(message._id)
        .populate({
          path: 'sender',
          select: 'name email profile.photo',
        })
        .exec();

      // Broadcast to other participants
      const otherParticipants = conversation.participants.filter(
        (p) => p._id.toString() !== userId.toString()
      );

      otherParticipants.forEach((participant) => {
        const participantId = participant._id.toString();
        const participantSocketId = this.connectedUsers.get(participantId);

        if (participantSocketId) {
          console.log(
            `✉️ Sending message to online participant: ${participantId}`
          );
          this.io.to(participantSocketId).emit('rent_sales_new_message', {
            message: populatedMessage,
            conversationId,
          });
        } else {
          console.log(`📵 Participant not online: ${participantId}`);
          // Queue push notification or other offline delivery
        }
      });

      // Acknowledge message send
      socket.emit('rent_sales_message_sent', {
        messageId: message._id,
        conversationId,
        message: populatedMessage,
        tempId: tempId, // Return the tempId to match with frontend
      });

      return populatedMessage;
    } catch (error) {
      console.error('❌ Error sending rent/sales message:', error);
      socket.emit('rent_sales_message_error', {
        error: error.message,
        tempId: data.tempId,
      });
      throw error;
    }
  }

  async handleRentSalesTypingEvent(socket, data) {
    const { conversationId, isTyping } = data;

    socket.join(conversationId);

    socket.to(conversationId).emit('rent_sales_typing', {
      userId: socket.user._id,
      userName: socket.user.name,
      conversationId,
      isTyping,
    });

    console.log(
      `✍️ ${socket.user._id} isTyping=${isTyping} in rent/sales conversation ${conversationId}`
    );
  }

  async handleRentSalesMessageRead(socket, data) {
    try {
      const { messageId, conversationId } = data;
      const userId = socket.user._id.toString();

      console.log(
        `📩 Rent/Sales read receipt received for message: ${messageId}`
      );

      // Validate message existence
      const message = await RentSalesMessage.findById(messageId);
      if (!message) {
        console.error('❌ Rent/Sales message not found');
        return socket.emit('rent_sales_message_error', {
          error: 'Message not found',
        });
      }

      // Check if already read
      const alreadyRead = message.readBy.some(
        (entry) => entry.user.toString() === userId.toString()
      );

      // Validate conversation
      const conversation = await RentSalesConversation.findById(conversationId);
      if (!conversation) {
        console.error('❌ Rent/Sales conversation not found');
        return socket.emit('rent_sales_message_error', {
          error: 'Conversation not found',
        });
      }

      // Ensure user is a participant
      if (!conversation.participants.some((p) => p.toString() === userId)) {
        console.error('❌ User is not part of the rent/sales conversation');
        return socket.emit('rent_sales_message_error', {
          error: 'Unauthorized access',
        });
      }

      if (!alreadyRead) {
        // Mark message as read
        const updatedMessage = await RentSalesMessage.findByIdAndUpdate(
          messageId,
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
        ).populate({
          path: 'readBy.user',
          select: 'name email',
        });

        console.log(`✅ Rent/Sales message marked as read by user: ${userId}`);

        // Reset unread count in conversation
        conversation.unreadCounts.set(userId, 0);
        await conversation.save();
        console.log(`📌 Rent/Sales unread count reset for user: ${userId}`);

        // Notify other participants
        socket.to(conversationId).emit('rent_sales_message_read', {
          messageId,
          userId: socket.user._id,
        });

        // Send acknowledgment to the user
        socket.emit('rent_sales_message_read_success', {
          messageId,
          conversationId,
          readBy: updatedMessage.readBy,
        });
      }
    } catch (error) {
      console.error('❌ Rent/Sales read receipt error:', error);
      socket.emit('rent_sales_message_error', {
        error: 'Failed to mark message as read',
      });
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
    console.log('🔔 Notifying user:', userId);
    const socketId = this.connectedUsers.get(userId);

    if (socketId) {
      this.io.to(socketId).emit(event, data);
      console.log(`✅ Notification sent to ${userId}:`, event);
    } else {
      console.log(`❌ User ${userId} is not online.`);
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
