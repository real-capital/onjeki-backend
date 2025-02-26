import { logger } from '../utils/logger.js';

export class SocketLogger {
  static logEvent(socket, event, data) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`Socket Event: ${event}`, {
        userId: socket.user?.id,
        socketId: socket.id,
        data,
      });
    }
  }

  static initialize(io) {
    if (process.env.NODE_ENV === 'development') {
      io.on('connection', (socket) => {
        socket.onAny((event, ...args) => {
          this.logEvent(socket, event, args);
        });
      });
    }
  }
}
