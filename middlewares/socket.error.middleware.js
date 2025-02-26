import { logger } from '../utils/logger.js';
// middleware/socket.error.middleware.js
export class SocketErrorHandler {
  static handle(error, socket) {
    logger.error('Socket Error:', {
      error: error.message,
      userId: socket.user?.id,
      socketId: socket.id,
    });

    socket.emit('error', {
      message: 'An error occurred',
      code: 'SOCKET_ERROR',
    });
  }
}
