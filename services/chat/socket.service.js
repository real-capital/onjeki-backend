// let io;

// export const initializeSocket = (server) => {
//   io = new Server(server, {
//     cors: {
//       origin: process.env.CLIENT_URL,
//       methods: ['GET', 'POST'],
//       credentials: true
//     }
//   });

//   // Authentication middleware
//   io.use(async (socket, next) => {
//     try {
//       const token = socket.handshake.auth.token;
//       if (!token) {
//         return next(new Error('Authentication error'));
//       }

//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       const user = await UserModel.findById(decoded.id);

//       if (!user) {
//         return next(new Error('User not found'));
//       }

//       socket.user = user;
//       next();
//     } catch (error) {
//       next(new Error('Authentication error'));
//     }
//   });

//   // Connection handler
//   io.on('connection', (socket) => {
//     console.log(`User connected: ${socket.user.id}`);

//     // Join user's personal room
//     socket.join(socket.user.id);

//     // Handle typing status
//     socket.on('typing_start', (conversationId) => {
//       socket.to(conversationId).emit('typing_start', {
//         userId: socket.user.id,
//         conversationId
//       });
//     });

//     socket.on('typing_end', (conversationId) => {
//       socket.to(conversationId).emit('typing_end', {
//         userId: socket.user.id,
//         conversationId
//       });
//     });

//     // Handle disconnect
//     socket.on('disconnect', () => {
//       console.log(`User disconnected: ${socket.user.id}`);
//     });
//   });

//   return io;
// };

// export const emitSocketEvent = (users, event, data) => {
//   if (!io) return;

//   if (Array.isArray(users)) {
//     users.forEach(userId => {
//       io.to(userId.toString()).emit(event, data);
//     });
//   } else {
//     io.to(users.toString()).emit(event, data);
//   }
// };

import { Server } from 'socket.io';
import { SocketMiddleware } from '../../middlewares/socket.middleware.js';
import { logger } from '../../utils/logger.js';
import { SocketErrorHandler } from '../../middlewares/socket.error.middleware.js';
import { SocketLogger } from '../../middlewares/socket.logger.middleware.js';
import ChatService from './chat.service.js';


// services/socket.service.js
export class SocketService {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.initialize();
  }

  initialize() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await UserModel.findById(decoded.id);
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.user = user;
        next();
      } catch (error) {
        logger.error(`Socket authentication error: ${error.message}`);
        next(new Error('Authentication failed'));
      }
    });

    // Basic connection handling
    this.io.on('connection', (socket) => {
      logger.info(`Socket connected: ${socket.id}`);

      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });

    // Error handling
    this.io.on('connect_error', (error) => {
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
// export class SocketService {
//   constructor(server) {
//     this.io = new Server(server, {
//       cors: {
//         origin: process.env.CLIENT_URL,
//         methods: ['GET', 'POST'],
//         credentials: true,
//       },
//     });

//     this.initialize();
//   }

//   initialize() {
//     // Apply authentication middleware
//     this.io.use(SocketMiddleware.authenticate);
 
//     this.io.on('connection', SocketMiddleware.handleConnection);

//     // Add logger in development
//     // if (process.env.NODE_ENV === 'development') {
//     //   SocketLogger.initialize(this.io);
//     // }

//     // Handle connections
//     // this.io.on('connection', SocketMiddleware.handleConnection);
//     this.io.on('connection', (socket) => {
//       try {
//         SocketMiddleware.handleConnection(socket);
//       } catch (error) {
//         SocketErrorHandler.handle(error, socket);
//       }
//     });

//     if (process.env.NODE_ENV === 'development') {
//       SocketLogger.initialize(this.io);
//     }

//     // Handle errors
//     this.io.on('connect_error', (error) => {
//       logger.error(`Socket connection error: ${error.message}`);
//     });
//   }

  

//   emitToUsers(users, event, data) {
//     if (Array.isArray(users)) {
//       users.forEach((userId) => {
//         this.io.to(userId.toString()).emit(event, data);
//       });
//     } else {
//       this.io.to(users.toString()).emit(event, data);
//     }
//   }

//   getIO() {
//     if (!this.io) {
//       throw new Error('Socket.io not initialized');
//     }
//     return this.io;
//   }
// }
