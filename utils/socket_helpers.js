// utils/socket.helpers.js
export class SocketHelper {
  static getRoomName(chatId) {
    return `chat_${chatId}`;
  }

  static getUserRoom(userId) {
    return `user_${userId}`;
  }
}
