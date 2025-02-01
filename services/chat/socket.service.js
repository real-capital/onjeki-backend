import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import UserModel from '../../models/user.model';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await UserModel.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);
    
    // Join user's personal room
    socket.join(socket.user.id);

    // Handle typing status
    socket.on('typing_start', (conversationId) => {
      socket.to(conversationId).emit('typing_start', {
        userId: socket.user.id,
        conversationId
      });
    });

    socket.on('typing_end', (conversationId) => {
      socket.to(conversationId).emit('typing_end', {
        userId: socket.user.id,
        conversationId
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

export const emitSocketEvent = (users, event, data) => {
  if (!io) return;

  if (Array.isArray(users)) {
    users.forEach(userId => {
      io.to(userId.toString()).emit(event, data);
    });
  } else {
    io.to(users.toString()).emit(event, data);
  }
};