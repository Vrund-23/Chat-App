import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { verifyToken } from '../utils/tokenUtils.js';

// Store connected users: { userId: socketId }
const connectedUsers = new Map();

export const initializeSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Authentication error'));
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Add user to connected users
    connectedUsers.set(socket.userId, socket.id);

    // Update user status to online
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      socketId: socket.id,
    });

    // Emit online status to all connected users
    io.emit('user-status', {
      userId: socket.userId,
      isOnline: true,
    });

    // Get online users
    socket.emit('online-users', Array.from(connectedUsers.keys()));

    // Handle new message
    socket.on('send-message', async (data) => {
      try {
        const { receiverId, content } = data;

        // Find or create conversation
        let conversation = await Conversation.findOne({
          participants: { $all: [socket.userId, receiverId] },
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [socket.userId, receiverId],
          });
        }

        // Create message
        const message = await Message.create({
          conversation: conversation._id,
          sender: socket.userId,
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

        const formattedMessage = {
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
        };

        // Send to sender
        socket.emit('message-received', formattedMessage);

        // Send to receiver if online
        const receiverSocketId = connectedUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message-received', formattedMessage);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message-error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing-start', (data) => {
      const { receiverId } = data;
      const receiverSocketId = connectedUsers.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user-typing', {
          userId: socket.userId,
          name: socket.user.name,
        });
      }
    });

    socket.on('typing-stop', (data) => {
      const { receiverId } = data;
      const receiverSocketId = connectedUsers.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user-stopped-typing', {
          userId: socket.userId,
        });
      }
    });

    // Handle message read receipt
    socket.on('message-read', async (data) => {
      try {
        const { messageId, senderId } = data;

        await Message.findByIdAndUpdate(messageId, {
          isRead: true,
          readAt: new Date(),
        });

        const senderSocketId = connectedUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message-read-receipt', {
            messageId,
            readAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);

      // Remove from connected users
      connectedUsers.delete(socket.userId);

      // Update user status to offline
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date(),
        socketId: '',
      });

      // Emit offline status to all connected users
      io.emit('user-status', {
        userId: socket.userId,
        isOnline: false,
        lastSeen: new Date(),
      });
    });
  });

  return io;
};