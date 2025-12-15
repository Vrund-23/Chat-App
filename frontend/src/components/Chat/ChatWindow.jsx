import { useState, useEffect, useRef } from 'react';
import { messageAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import UserAvatar from '../Common/UserAvatar';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { formatMessageTime } from '../../utils/helpers';
import socketService from '../../services/socket';

const ChatWindow = ({ selectedUser, onBack }) => {
  const { user } = useAuth();
  const { sendMessage, startTyping, stopTyping, onlineUsers } = useSocket();
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
    const handleNewMessage = (message) => {
      if (
        message.sender.id === selectedUser?.id ||
        message.receiver.id === selectedUser?.id
      ) {
        setMessages((prev) => [...prev, message]);
        
        if (message.sender.id === selectedUser?.id) {
          markMessagesAsRead();
        }
      }
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

    const handleMessageRead = ({ messageId, readAt }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, isRead: true, readAt } : msg
        )
      );
    };

    socketService.on('message-received', handleNewMessage);
    socketService.on('user-typing', handleUserTyping);
    socketService.on('user-stopped-typing', handleUserStoppedTyping);
    socketService.on('message-read-receipt', handleMessageRead);

    return () => {
      socketService.off('message-received', handleNewMessage);
      socketService.off('user-typing', handleUserTyping);
      socketService.off('user-stopped-typing', handleUserStoppedTyping);
      socketService.off('message-read-receipt', handleMessageRead);
    };
  }, [selectedUser]);

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
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = (content) => {
    sendMessage(selectedUser.id, content);
  };

  const handleTyping = (typing) => {
    if (typing) {
      startTyping(selectedUser.id);
    } else {
      stopTyping(selectedUser.id);
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
          {/* Back Button - Only visible on mobile */}
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

          <UserAvatar user={selectedUser} showOnline />
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-800 truncate">
              {selectedUser.name}
            </h2>
            <p className="text-sm text-gray-500 truncate">
              {isUserOnline ? (
                <span className="text-green-600 font-medium">Online</span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isSent = msg.sender.id === user.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isSent ? 'justify-end' : 'justify-start'} slide-up`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg break-words ${
                    isSent
                      ? 'bg-primary text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <div className={`flex items-center gap-1 mt-1 text-xs ${
                    isSent ? 'text-gray-200' : 'text-gray-500'
                  }`}>
                    <span>{formatMessageTime(msg.createdAt)}</span>
                    {isSent && (
                      <span>
                        {msg.isRead ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-blue-300"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {isTyping && <TypingIndicator userName={selectedUser.name} />}

      {/* Message Input */}
      <MessageInput onSendMessage={handleSendMessage} onTyping={handleTyping} />
    </div>
  );
};

export default ChatWindow;