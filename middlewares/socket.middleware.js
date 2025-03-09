// middleware/socket.middleware.js
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model.js';
import { logger } from '../utils/logger.js';

export class SocketMiddleware {
  static async authenticate(socket, next) {
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
  }

  static async handleConnection(socket) {
    logger.info(`User connected: ${socket.user.id}`);
    socket.join(socket.user.id);

    // Handle typing status
    socket.on('typing_start', (conversationId) => {
      socket.to(conversationId).emit('typing_start', {
        userId: socket.user.id,
        conversationId,
      });
    });

    socket.on('typing_end', (conversationId) => {
      socket.to(conversationId).emit('typing_end', {
        userId: socket.user.id,
        conversationId,
      });
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user.id}`);
    });
  }

  // middlewares/socket.middleware.js
// export const handleSocketError = (err, req, res, next) => {
//   if (err.message.includes('SocketService')) {
//     logger.error('Socket Service Error:', err);
//     return res.status(500).json({
//       status: 'error',
//       message: 'Socket communication error',
//       errorCode: 'SOCKET_ERROR'
//     });
//   }
//   next(err);
// };

// // Add to your app.js
// this.app.use(handleSocketError);
}
