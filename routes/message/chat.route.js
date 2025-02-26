import express from 'express';
import multer from 'multer';
import { isAuthenticated } from '../../middlewares/auth.js';
import { Route } from '../../interfaces/route.interface.js';
import ChatController from '../../controller/chat/chat.controller.js';
const storage = multer.diskStorage({
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  },
});

const upload = multer({ storage });
class ChatRoute extends Route {
  constructor() {
    super(express.Router()); // Initialize the parent class
    this.path = '/chats'; // Set the base path
    this.controller = new ChatController(); // Instantiate the controller
    this.initializeRoute();
  }

  initializeRoute() {
    this.router.get('/chats', isAuthenticated, this.controller.getUserChats);
    this.router.post('/chats', isAuthenticated, this.controller.createChat);
    this.router.get(
      '/chats/:chatId',
      isAuthenticated,
      this.controller.getChatById
    );
    this.router.delete(
      '/chats/:chatId',
      isAuthenticated,
      this.controller.deleteChat
    );
    this.router.get(
      '/chats/:chatId/messages',
      isAuthenticated,
      this.controller.getChatMessages
    );
    this.router.patch(
      '/chats/:chatId/messages/read',
      isAuthenticated,
      this.controller.markMessagesAsRead
    );
    this.router.post(
      '/chats/:chatId/attachments',
      isAuthenticated,
      upload.single('file'),
      this.controller.uploadAttachment
    );
    this.router.get(
      '/chats/:chatId/stats',
      isAuthenticated,
      this.controller.getChatStats
    );
  }
}

export default ChatRoute;
