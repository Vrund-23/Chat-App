import { createContext, useContext, useState, useEffect } from 'react';
import socketService from '../services/socket.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (isAuthenticated && socketService.isConnected()) {
      // Listen for online users
      socketService.on('online-users', (users) => {
        setOnlineUsers(users);
      });

      // Listen for user status changes
      socketService.on('user-status', ({ userId, isOnline }) => {
        setOnlineUsers((prev) => {
          if (isOnline && !prev.includes(userId)) {
            return [...prev, userId];
          } else if (!isOnline) {
            return prev.filter((id) => id !== userId);
          }
          return prev;
        });
      });
    }

    return () => {
      socketService.off('online-users');
      socketService.off('user-status');
    };
  }, [isAuthenticated]);

  const sendMessage = (receiverId, content) => {
    socketService.emit('send-message', { receiverId, content });
  };

  const startTyping = (receiverId) => {
    socketService.emit('typing-start', { receiverId });
  };

  const stopTyping = (receiverId) => {
    socketService.emit('typing-stop', { receiverId });
  };

  const markMessageAsRead = (messageId, senderId) => {
    socketService.emit('message-read', { messageId, senderId });
  };

  return (
    <SocketContext.Provider
      value={{
        onlineUsers,
        sendMessage,
        startTyping,
        stopTyping,
        markMessageAsRead,
        socket: socketService.socket,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};