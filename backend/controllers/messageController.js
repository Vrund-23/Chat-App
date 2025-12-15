import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id;

    // Check if receiver exists
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
        isRead: message.isRead,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get conversation messages
// @route   GET /api/messages/:userId
// @access  Private
export const getMessages = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Find conversation
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

    // Get messages
    const messages = await Message.find({
      conversation: conversation._id,
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
        isRead: msg.isRead,
        readAt: msg.readAt,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all conversations for current user
// @route   GET /api/messages/conversations
// @access  Private
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'name email mobile profileImage isOnline lastSeen')
      .populate('lastMessage')
      .sort({ lastMessageTime: -1 });

    const formattedConversations = conversations.map((conv) => {
      const otherUser = conv.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );

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
              content: conv.lastMessage.content,
              createdAt: conv.lastMessage.createdAt,
              isRead: conv.lastMessage.isRead,
              senderId: conv.lastMessage.sender,
            }
          : null,
        lastMessageTime: conv.lastMessageTime,
      };
    });

    res.status(200).json({
      success: true,
      count: formattedConversations.length,
      conversations: formattedConversations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:userId
// @access  Private
export const markAsRead = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Find conversation
    const conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, userId] },
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Update unread messages
    await Message.updateMany(
      {
        conversation: conversation._id,
        receiver: currentUserId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
    });
  } catch (error) {
    next(error);
  }
};