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

  // UPDATED: Returns a Promise
  const sendMessage = (receiverId, content, messageType = 'text', mediaData = null) => {
    return new Promise((resolve, reject) => {
        const payload = { 
            receiverId, 
            content,
            messageType
        };
        
        if (mediaData) {
            payload.mediaUrl = mediaData.url;
            payload.mediaName = mediaData.name;
        }

        socketService.emit('send-message', payload, (response) => {
            if (response?.status === 'ok') {
                resolve(response.data);
            } else {
                reject(response?.message || 'Failed to send');
            }
        });
    });
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