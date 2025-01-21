// config/socket.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

export const setupWebSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS.split(','),
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('Authentication error');
      }
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);
    
    // Join user's personal room
    socket.join(`user:${socket.user.id}`);

    // Handle real-time messaging
    socket.on('send-message', async (data) => {
      const { recipientId, message } = data;
      io.to(`user:${recipientId}`).emit('new-message', {
        senderId: socket.user.id,
        message
      });
    });

    // Handle property updates
    socket.on('property-update', async (data) => {
      io.emit('property-changed', data);
    });

    // Handle booking status changes
    socket.on('booking-status-change', async (data) => {
      const { bookingId, status } = data;
      io.to(`booking:${bookingId}`).emit('booking-updated', { status });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};