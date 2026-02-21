import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { verifyToken } from '../utils/tokenUtils.js';

const connectedUsers = new Map();

export const initializeSocket = (io) => {
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
    console.log(`✅ User connected: ${socket.userId}`);

    connectedUsers.set(socket.userId, socket.id);

    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      socketId: socket.id,
    });

    io.emit('user-status', {
      userId: socket.userId,
      isOnline: true,
    });

    socket.emit('online-users', Array.from(connectedUsers.keys()));

    // Check for undelivered messages
    const pendingMessages = await Message.find({
      receiver: socket.userId,
      isDelivered: false,
    });

    if (pendingMessages.length > 0) {
      await Message.updateMany(
        { receiver: socket.userId, isDelivered: false },
        { isDelivered: true, deliveredAt: new Date() }
      );

      // Notify senders that their messages are now delivered
      pendingMessages.forEach((msg) => {
        const senderSocketId = connectedUsers.get(msg.sender.toString());
        if (senderSocketId) {
          io.to(senderSocketId).emit('message-delivered', {
            messageId: msg._id,
            deliveredAt: new Date(),
          });
        }
      });
    }

    // Send message (Updated with Acknowledgement Callback)
    socket.on('send-message', async (data, callback) => {
      try {
        const { receiverId, content, messageType = 'text', mediaUrl, mediaName } = data;

        let conversation = await Conversation.findOne({
          participants: { $all: [socket.userId, receiverId] },
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [socket.userId, receiverId],
          });
        }

        const message = await Message.create({
          conversation: conversation._id,
          sender: socket.userId,
          receiver: receiverId,
          content,
          messageType,
          mediaUrl,
          mediaName,
          isDelivered: false,
          isRead: false
        });

        conversation.lastMessage = message._id;
        conversation.lastMessageTime = message.createdAt;
        await conversation.save();

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
          messageType: message.messageType,
          mediaUrl: message.mediaUrl,
          mediaName: message.mediaName,
          isDelivered: message.isDelivered,
          isRead: message.isRead,
          createdAt: message.createdAt,
        };

        // Check if receiver is online
        const receiverSocketId = connectedUsers.get(receiverId);
        
        if (receiverSocketId) {
          // Update DB immediately
          message.isDelivered = true;
          message.deliveredAt = new Date();
          await message.save();

          formattedMessage.isDelivered = true;
          formattedMessage.deliveredAt = message.deliveredAt;

          // Send to receiver
          io.to(receiverSocketId).emit('message-received', formattedMessage);
          
          // Notify Sender that message was delivered (Double Tick)
          socket.emit('message-delivered', {
            messageId: message._id,
            deliveredAt: message.deliveredAt,
          });
        }

        // ACKNOWLEDGEMENT: Verify to sender that server received it (Single Tick)
        if (callback) {
          callback({
            status: 'ok',
            data: formattedMessage
          });
        }

      } catch (error) {
        console.error('Error sending message:', error);
        if (callback) {
          callback({
            status: 'error',
            message: 'Failed to send message'
          });
        }
      }
    });

    // Typing indicators
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

    // Message read receipt
    socket.on('message-read', async (data) => {
      try {
        const { messageId, senderId } = data;

        await Message.findByIdAndUpdate(messageId, {
          isRead: true,
          isDelivered: true,
          readAt: new Date(),
        });

        const senderSocketId = connectedUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('message-read-receipt', {
            messageId,
            readAt: new Date(),
          });
        }
        
        // Also notify the user who read it (for other open tabs)
        const readerSocketId = connectedUsers.get(socket.userId);
        if (readerSocketId) {
             socket.to(readerSocketId).emit('message-read-receipt', {
                 messageId, 
                 readAt: new Date()
             });
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Mark all messages as read in conversation
    socket.on('mark-conversation-read', async (data) => {
      try {
        const { userId } = data;

        const conversation = await Conversation.findOne({
          participants: { $all: [socket.userId, userId] },
        });

        if (conversation) {
          const messages = await Message.find({
            conversation: conversation._id,
            receiver: socket.userId,
            isRead: false,
          });

          await Message.updateMany(
            {
              conversation: conversation._id,
              receiver: socket.userId,
              isRead: false,
            },
            {
              isRead: true,
              isDelivered: true,
              readAt: new Date(),
            }
          );

          const senderSocketId = connectedUsers.get(userId);
          if (senderSocketId) {
            messages.forEach((msg) => {
              io.to(senderSocketId).emit('message-read-receipt', {
                messageId: msg._id,
                readAt: new Date(),
              });
            });
          }
        }
      } catch (error) {
        console.error('Error marking conversation as read:', error);
      }
    });

    // Message deleted
    socket.on('delete-message', async (data) => {
      try {
        const { messageId, forEveryone } = data;

        const message = await Message.findById(messageId);
        if (!message) return;

        if (forEveryone && message.sender.toString() === socket.userId) {
          message.isDeleted = true;
          message.deletedBy = [message.sender, message.receiver];
          message.deletedAt = new Date();
          await message.save();

          // Notify receiver
          const receiverSocketId = connectedUsers.get(message.receiver.toString());
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('message-deleted-for-everyone', {
              messageId,
            });
          }
        } else {
          if (!message.deletedBy.includes(socket.userId)) {
            message.deletedBy.push(socket.userId);
          }
          if (message.deletedBy.length === 2) {
            message.isDeleted = true;
            message.deletedAt = new Date();
          }
          await message.save();
        }

        socket.emit('message-delete-confirmed', { messageId });
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.userId}`);

      connectedUsers.delete(socket.userId);

      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date(),
        socketId: '',
      });

      io.emit('user-status', {
        userId: socket.userId,
        isOnline: false,
        lastSeen: new Date(),
      });
    });
  });

  return io;
};