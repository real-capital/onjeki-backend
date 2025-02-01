import Message from '../../models/message_model';
import Conversation from '../../models/conversation.model';
import { uploadFile } from './uploadService';
import { emitSocketEvent } from './socketService';

class MessageService {
  sendMessage = async ({
    conversationId,
    senderId,
    content,
    attachments = [],
    type = 'text',
  }) => {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Handle file uploads if any
    const processedAttachments = [];
    if (attachments.length > 0) {
      for (const file of attachments) {
        const uploadedFile = await uploadFile(file, 'messages');
        processedAttachments.push({
          type: file.mimetype.startsWith('image/') ? 'image' : 'file',
          url: uploadedFile.url,
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        });
      }
    }

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender: senderId,
      content,
      attachments: processedAttachments,
      type,
      readBy: [{ user: senderId }],
    });

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.participants.forEach((participantId) => {
      if (participantId.toString() !== senderId.toString()) {
        const currentCount =
          conversation.unreadCounts.get(participantId.toString()) || 0;
        conversation.unreadCounts.set(
          participantId.toString(),
          currentCount + 1
        );
      }
    });
    await conversation.save();

    // Emit socket event
    emitSocketEvent(conversation.participants, 'new_message', {
      conversationId,
      message: await message.populate('sender', 'profile.name profile.photo'),
    });

    return message;
  };
}

export default MessageService;
