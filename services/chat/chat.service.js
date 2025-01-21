// // services/chat.service.js
// import mongoose from 'mongoose';
// import ChatModel from '../models/chat.model.js';
// import MessageModel from '../models/message.model.js';

// class ChatService {
//   constructor(io) {
//     this.io = io;
//     this.setupSocketHandlers();
//   }

//   setupSocketHandlers() {
//     this.io.on('connection', (socket) => {
//       socket.on('join-chat', (chatId) => {
//         socket.join(chatId);
//       });

//       socket.on('send-message', async (messageData) => {
//         const message = await this.saveMessage(messageData);
//         this.io.to(messageData.chatId).emit('new-message', message);
//       });

//       socket.on('typing', (data) => {
//         socket.to(data.chatId).emit('user-typing', data.userId);
//       });
//     });
//   }

//   async createChat(userId1, userId2, propertyId) {
//     const existingChat = await ChatModel.findOne({
//       users: { $all: [userId1, userId2] },
//       property: propertyId
//     });

//     if (existingChat) {
//       return existingChat;
//     }

//     const newChat = await ChatModel.create({
//       users: [userId1, userId2],
//       property: propertyId
//     });

//     return newChat;
//   }

//   async saveMessage(messageData) {
//     const message = await MessageModel.create({
//       chat: messageData.chatId,
//       sender: messageData.senderId,
//       content: messageData.content,
//       type: messageData.type // text, image, etc.
//     });

//     await ChatModel.findByIdAndUpdate(messageData.chatId, {
//       lastMessage: message._id,
//       $inc: { messageCount: 1 }
//     });

//     return message;
//   }

//   async getChatHistory(chatId, pagination) {
//     const { page = 1, limit = 50 } = pagination;
//     const messages = await MessageModel.find({ chat: chatId })
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(limit)
//       .populate('sender', 'name');

//     return messages.reverse();
//   }

//   async getUserChats(userId) {
//     return ChatModel.find({ users: userId })
//       .populate('users', 'name')
//       .populate('property', 'title photos')
//       .populate('lastMessage');
//   }
// }

// export default ChatService;