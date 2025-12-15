import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text', mediaUrl, mediaName, mediaSize } = req.body;
    const senderId = req.user._id;

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found',
      });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    // Create message
    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      receiver: receiverId,
      content,
      messageType,
      mediaUrl,
      mediaName,
      mediaSize,
    });

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageTime = message.createdAt;
    await conversation.save();

    // Populate message
    await message.populate('sender', 'name email mobile profileImage');
    await message.populate('receiver', 'name email mobile profileImage');

    res.status(201).json({
      success: true,
      message: {
        id: message._id,
        conversationId: message.conversation,
        sender: {
          id: message.sender._id,
          name: message.sender.name,
          profileImage: message.sender.profileImage,
        },
        receiver: {
          id: message.receiver._id,
          name: message.receiver.name,
          profileImage: message.receiver.profileImage,
        },
        content: message.content,
        messageType: message.messageType,
        mediaUrl: message.mediaUrl,
        mediaName: message.mediaName,
        isDelivered: message.isDelivered,
        isRead: message.isRead,
        isDeleted: message.isDeleted,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get conversation messages
// @route   GET /api/messages/:userId
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, userId] },
    });

    if (!conversation) {
      return res.status(200).json({
        success: true,
        count: 0,
        messages: [],
      });
    }

    // Get messages that are not deleted by current user
    const messages = await Message.find({
      conversation: conversation._id,
      deletedBy: { $ne: currentUserId },
    })
      .populate('sender', 'name email mobile profileImage')
      .populate('receiver', 'name email mobile profileImage')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages: messages.map((msg) => ({
        id: msg._id,
        conversationId: msg.conversation,
        sender: {
          id: msg.sender._id,
          name: msg.sender.name,
          profileImage: msg.sender.profileImage,
        },
        receiver: {
          id: msg.receiver._id,
          name: msg.receiver.name,
          profileImage: msg.receiver.profileImage,
        },
        content: msg.content,
        messageType: msg.messageType,
        mediaUrl: msg.mediaUrl,
        mediaName: msg.mediaName,
        isDelivered: msg.isDelivered,
        deliveredAt: msg.deliveredAt,
        isRead: msg.isRead,
        readAt: msg.readAt,
        isDeleted: msg.isDeleted,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all conversations for current user (with last message)
// @route   GET /api/messages/conversations
// @access  Private
export const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'name email mobile profileImage isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        match: { deletedBy: { $ne: userId } }, // Don't show deleted messages
      })
      .sort({ lastMessageTime: -1 });

    // Filter out conversations with no messages or deleted last messages
    const validConversations = conversations.filter(conv => conv.lastMessage);

    const formattedConversations = validConversations.map((conv) => {
      const otherUser = conv.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );

      // Count unread messages
      const unreadCount = 0; // Will be implemented with socket

      return {
        id: conv._id,
        user: {
          id: otherUser._id,
          name: otherUser.name,
          email: otherUser.email,
          mobile: otherUser.mobile,
          profileImage: otherUser.profileImage,
          isOnline: otherUser.isOnline,
          lastSeen: otherUser.lastSeen,
        },
        lastMessage: conv.lastMessage
          ? {
              id: conv.lastMessage._id,
              content: conv.lastMessage.content,
              messageType: conv.lastMessage.messageType,
              createdAt: conv.lastMessage.createdAt,
              isRead: conv.lastMessage.isRead,
              senderId: conv.lastMessage.sender,
            }
          : null,
        lastMessageTime: conv.lastMessageTime,
        unreadCount,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedConversations.length,
      conversations: formattedConversations,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark messages as delivered
// @route   PUT /api/messages/delivered/:userId
// @access  Private
export const markAsDelivered = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, userId] },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    await Message.updateMany(
      {
        conversation: conversation._id,
        receiver: currentUserId,
        isDelivered: false,
      },
      {
        isDelivered: true,
        deliveredAt: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as delivered',
    });
  } catch (error) {
    console.error('Mark as delivered error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:userId
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, userId] },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const result = await Message.updateMany(
      {
        conversation: conversation._id,
        receiver: currentUserId,
        isRead: false,
      },
      {
        isRead: true,
        isDelivered: true,
        readAt: new Date(),
        deliveredAt: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete message (for me)
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if user is part of this conversation
    if (
      message.sender.toString() !== currentUserId.toString() &&
      message.receiver.toString() !== currentUserId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message',
      });
    }

    // Add user to deletedBy array
    if (!message.deletedBy.includes(currentUserId)) {
      message.deletedBy.push(currentUserId);
    }

    // If both users deleted, mark as fully deleted
    if (message.deletedBy.length === 2) {
      message.isDeleted = true;
      message.deletedAt = new Date();
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};