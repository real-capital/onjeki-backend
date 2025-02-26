// utils/socket.constants.js
export const SOCKET_EVENTS = {
  USER_CONNECTED: 'user_connected',
  JOIN_CHAT: 'join_chat',
  LEAVE_CHAT: 'leave_chat',
  SEND_MESSAGE: 'send_message',
  NEW_MESSAGE: 'new_message',
  ERROR: 'error',
};

export const getRoomName = (chatId) => `chat_${chatId}`;
export const getUserRoom = (userId) => `user_${userId}`;
