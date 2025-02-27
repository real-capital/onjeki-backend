import { Server } from 'socket.io';
import { logger } from '../../utils/logger.js';

import UserModel from '../../models/user.model.js';
import Jwt from '../../utils/jwt.js';

// services/socket.service.js
export class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        // Allow multiple origins
        origin: '*',
        // origin: [
        //   process.env.CLIENT_URL_ANDROID,
        //   process.env.CLIENT_URL_IOS,
        //   process.env.CLIENT_URL_PRODUCTION,
        // ].filter(Boolean), // Filter out undefined values
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.initialize();
  }

  initialize() {
    // Authentication middleware
    // this.io.use(async (socket, next) => {
    //   try {
    //     const token = socket.handshake.auth.token;
    //     if (!token) {
    //       return next(new Error('Authentication required'));
    //     }

    //     const decoded = Jwt.verify(token, process.env.JWT_SECRET);
    //     const user = await UserModel.findById(decoded.id);

    //     if (!user) {
    //       return next(new Error('User not found'));
    //     }

    //     socket.user = user;
    //     next();
    //   } catch (error) {
    //     logger.error(`Socket authentication error: ${error.message}`);
    //     next(new Error('Authentication failed'));
    //   }
    // });

    // Basic connection handling
    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);
      logger.info(`Socket connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });

    // Error handling
    this.io.on('connect_error', (error) => {
      console.log(`Socket connection error: ${error.message}`);
      logger.error(`Socket connection error: ${error.message}`);
    });
  }

  getIO() {
    if (!this.io) {
      throw new Error('Socket.io not initialized');
    }
    return this.io;
  }

  emitToUsers(users, event, data) {
    if (Array.isArray(users)) {
      users.forEach((userId) => {
        this.io.to(userId.toString()).emit(event, data);
      });
    } else {
      this.io.to(users.toString()).emit(event, data);
    }
  }
}
