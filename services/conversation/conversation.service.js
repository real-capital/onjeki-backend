import Conversation from '../../models/conversation.model.js';
import Message from '../../models/message.model.js';
import HttpException from '../../utils/exception.js';

class ConversationService {
  constructor(socketService) {
    this.socketService = socketService;
  }

  async createConversation(participants, metadata = {}) {
    try {
      // Check for existing conversation
      const existingConversation = await Conversation.findOne({
        participants: { 
          $all: participants,
          $size: participants.length 
        }
      });

      if (existingConversation) {
        return existingConversation;
      }

      const conversation = new Conversation({
        participants,
        ...metadata
      });

      await conversation.save();
      return conversation;
    } catch (error) {
      throw new HttpException(500, 'Error creating conversation');
    }
  }

  async sendMessage(senderId, conversationId, content, attachments = []) {
    try {
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new HttpException(404, 'Conversation not found');
      }

      // Validate sender is part of conversation
      if (!conversation.participants.includes(senderId)) {
        throw new HttpException(403, 'Unauthorized to send message');
      }

      const message = new Message({
        conversation: conversationId,
        sender: senderId,
        content,
        attachments
      });

      await message.save();

      // Update conversation's last message
      conversation.lastMessage = message._id;
      
      // Update unread counts
      conversation.unreadCounts.set(
        senderId.toString(), 
        0
      );
      conversation.participants.forEach(participantId => {
        if (participantId.toString() !== senderId.toString()) {
          const currentCount = conversation.unreadCounts.get(participantId.toString()) || 0;
          conversation.unreadCounts.set(participantId.toString(), currentCount + 1);
        }
      });

      await conversation.save();

      // Notify other participants via socket
      const otherParticipants = conversation.participants.filter(
        id => id.toString() !== senderId.toString()
      );

      otherParticipants.forEach(participantId => {
        this.socketService.notifyUser(participantId, 'new_message', {
          conversationId,
          message,
          sender: senderId
        });
      });

      return message;
    } catch (error) {
      throw new HttpException(500, 'Error sending message');
    }
  }

  async getConversations(userId, options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      status = 'active' 
    } = options;

    try {
      const conversations = await Conversation.find({
        participants: userId,
        status
      })
      .populate('participants', 'name photo')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

      return conversations;
    } catch (error) {
      throw new HttpException(500, 'Error fetching conversations');
    }
  }

  async getConversationMessages(conversationId, userId, options = {}) {
    const { 
      page = 1, 
      limit = 50 
    } = options;

    try {
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new HttpException(404, 'Conversation not found');
      }

      // Validate user is part of conversation
      if (!conversation.participants.includes(userId)) {
        throw new HttpException(403, 'Unauthorized to view messages');
      }

      const messages = await Message.find({
        conversation: conversationId,
        deletedFor: { $ne: userId }
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', 'name photo');

      // Mark messages as read for this user
      await Message.updateMany(
        { 
          conversation: conversationId, 
          'readBy.user': { $ne: userId } 
        },
        { 
          $push: { 
            readBy: { 
              user: userId, 
              readAt: new Date() 
            } 
          } 
        }
      );

      // Reset unread count for this conversation
      conversation.unreadCounts.set(userId.toString(), 0);
      await conversation.save();

      return messages;
    } catch (error) {
      throw new HttpException(500, 'Error fetching messages');
    }
  }

  async archiveConversation(conversationId, userId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new HttpException(404, 'Conversation not found');
      }

      if (!conversation.participants.includes(userId)) {
        throw new HttpException(403, 'Unauthorized to archive conversation');
      }

      conversation.status = 'archived';
      await conversation.save();

      return conversation;
    } catch (error) {
      throw new HttpException(500, 'Error archiving conversation');
    }
  }
}

export default ConversationService;