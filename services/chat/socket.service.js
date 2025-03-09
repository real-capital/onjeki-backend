import { Server } from 'socket.io';
import { logger } from '../../utils/logger.js';

import UserModel from '../../models/user.model.js';
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

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
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

      socket.on('authenticate', (userId) => {
        this.handleAuthentication(socket, userId);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error: ${error.message}`);
      });
    });
  }
  handleAuthentication(socket, userId) {
    try {
      // Add socket to user's socket set
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(socket.id);
      socket.userId = userId;

      // Join user-specific room
      socket.join(`user_${userId}`);

      logger.info(`User ${userId} authenticated on socket ${socket.id}`);
    } catch (error) {
      logger.error(`Authentication error: ${error.message}`);
      socket.emit('auth_error', { message: 'Authentication failed' });
    }
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
