import { useState, useEffect, useRef } from 'react';
import { messageAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import UserAvatar from '../Common/UserAvatar';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import MessageItem from './MessageItem';
import socketService from '../../services/socket';

const ChatWindow = ({ selectedUser, onBack }) => {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Handle message sent by me (instant display)
    const handleMessageSent = (message) => {
      console.log('Message sent event:', message);
      if (
        message.receiver.id === selectedUser?.id &&
        message.sender.id === user.id
      ) {
        // Add message instantly to UI
        setMessages((prev) => {
          // Check if message already exists
          const exists = prev.some(m => m.id === message.id);
          if (!exists) {
            return [...prev, message];
          }
          return prev;
        });
      }
    };

    // Handle message received from other user
    const handleNewMessage = (message) => {
      console.log('Message received event:', message);
      if (
        message.sender.id === selectedUser?.id &&
        message.receiver.id === user.id
      ) {
        setMessages((prev) => {
          const exists = prev.some(m => m.id === message.id);
          if (!exists) {
            return [...prev, message];
          }
          return prev;
        });
        
        markMessagesAsRead();
        
        // Send read receipt
        socketService.emit('message-read', {
          messageId: message.id,
          senderId: message.sender.id,
        });
      }
    };

    const handleMessageDelivered = ({ messageId, deliveredAt }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isDelivered: true, deliveredAt } : msg
        )
      );
    };

    const handleMessageRead = ({ messageId, readAt }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isRead: true, readAt } : msg
        )
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    };

    const handleUserTyping = ({ userId }) => {
      if (userId === selectedUser?.id) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    const handleUserStoppedTyping = ({ userId }) => {
      if (userId === selectedUser?.id) {
        setIsTyping(false);
      }
    };

    socketService.on('message-sent', handleMessageSent);
    socketService.on('message-received', handleNewMessage);
    socketService.on('message-delivered', handleMessageDelivered);
    socketService.on('message-read-receipt', handleMessageRead);
    socketService.on('message-deleted-for-everyone', handleMessageDeleted);
    socketService.on('user-typing', handleUserTyping);
    socketService.on('user-stopped-typing', handleUserStoppedTyping);

    return () => {
      socketService.off('message-sent', handleMessageSent);
      socketService.off('message-received', handleNewMessage);
      socketService.off('message-delivered', handleMessageDelivered);
      socketService.off('message-read-receipt', handleMessageRead);
      socketService.off('message-deleted-for-everyone', handleMessageDeleted);
      socketService.off('user-typing', handleUserTyping);
      socketService.off('user-stopped-typing', handleUserStoppedTyping);
    };
  }, [selectedUser, user.id]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await messageAPI.getMessages(selectedUser.id);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await messageAPI.markAsRead(selectedUser.id);
      
      socketService.emit('mark-conversation-read', {
        userId: selectedUser.id,
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = (content, mediaData = null) => {
    if (mediaData) {
      socketService.emit('send-message', {
        receiverId: selectedUser.id,
        content: mediaData.caption || '',
        messageType: mediaData.type,
        mediaUrl: mediaData.url,
        mediaName: mediaData.name,
      });
    } else {
      socketService.emit('send-message', {
        receiverId: selectedUser.id,
        content,
        messageType: 'text',
      });
    }
  };

  const handleTyping = (typing) => {
    if (typing) {
      socketService.emit('typing-start', { receiverId: selectedUser.id });
    } else {
      socketService.emit('typing-stop', { receiverId: selectedUser.id });
    }
  };

  const handleDeleteMessage = async (messageId, forEveryone = false) => {
    try {
      await messageAPI.deleteMessage(messageId);
      
      if (forEveryone) {
        socketService.emit('delete-message', {
          messageId,
          forEveryone: true,
        });
      }
      
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-24 w-24 mx-auto text-gray-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h2 className="text-2xl font-semibold text-gray-600 mb-2">
            Select a chat
          </h2>
          <p className="text-gray-500">Choose a user to start messaging</p>
        </div>
      </div>
    );
  }

  const isUserOnline = onlineUsers.includes(selectedUser.id);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-screen">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="md:hidden p-2 hover:bg-gray-100 rounded-full transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* <UserAvatar user={selectedUser} showOnline />
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-800 truncate">
              {selectedUser.name}
            </h2>
            <p className="text-sm text-gray-500 truncate">
              {isUserOnline ? (
                <span className="text-green-600 font-medium">Online</span>
              ) : (
                `Last seen ${new Date(selectedUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              )}
            </p>
          </div> 
          <UserAvatar user={selectedUser} showOnline />*/}

{/* <div className="flex-1 min-w-0">
  <h2 className="font-semibold text-gray-800 truncate">
    {selectedUser.name}
  </h2>
  <p className="text-sm text-gray-500 truncate">
    {isUserOnline ? (
      <span className="text-green-600 font-medium">Online</span>
    ) : (
      <span>
        Last seen{" "}
        {new Date(selectedUser.lastSeen).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    )}
  </p>
</div> */}

<UserAvatar user={selectedUser} showOnline />

<div className="flex-1 min-w-0">
  <h2 className="font-semibold text-gray-800 truncate">
    {selectedUser.name}
  </h2>
  <p className="text-sm text-gray-500 truncate">
    {isUserOnline ? (
  <span className="text-green-600 font-medium">Online</span>
) : (
  <span>
    Last seen{" "}
    {new Date(selectedUser.lastSeen).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}
  </span>
)}

  </p>
</div>




        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2"
        style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M0 0h100v100H0z" fill="%23f0f0f0"/%3E%3C/svg%3E")',
          backgroundColor: '#e5ddd5'
        }}
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="mb-2">No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isSent={msg.sender.id === user.id}
              onDelete={handleDeleteMessage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {isTyping && <TypingIndicator userName={selectedUser.name} />}

      {/* Message Input */}
      <MessageInput 
        onSendMessage={handleSendMessage} 
        onTyping={handleTyping}
      />
    </div>
  );
};

export default ChatWindow;