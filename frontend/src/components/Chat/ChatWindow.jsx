import { useState, useEffect, useRef } from 'react';
import { messageAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import UserAvatar from '../Common/UserAvatar';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import MessageItem from './MessageItem';
import socketService from '../../services/socket';

const ChatWindow = ({ selectedUser, onBack }) => {
  const { user } = useAuth();
  const { onlineUsers } = useSocket();
  const { isDark, toggleTheme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
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
        message.sender.id === selectedUser?.id &&
        message.receiver.id === user.id
      ) {
        setMessages((prev) => {
          const exists = prev.some(m => m.id === message.id);
          if (!exists) return [...prev, message];
          return prev;
        });
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
          msg.id === messageId ? { ...msg, isRead: true, isDelivered: true, readAt } : msg
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
      if (userId === selectedUser?.id) setIsTyping(false);
    };

    socketService.on('message-received', handleNewMessage);
    socketService.on('message-delivered', handleMessageDelivered);
    socketService.on('message-read-receipt', handleMessageRead);
    socketService.on('message-deleted-for-everyone', handleMessageDeleted);
    socketService.on('user-typing', handleUserTyping);
    socketService.on('user-stopped-typing', handleUserStoppedTyping);

    return () => {
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
      socketService.emit('mark-conversation-read', { userId: selectedUser.id });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async (content, mediaData = null) => {
    const tempId = Date.now().toString();

    const optimisticMessage = {
      id: tempId,
      conversationId: 'temp',
      sender: { id: user.id, name: user.name, profileImage: user.profileImage },
      receiver: { id: selectedUser.id, name: selectedUser.name },
      content: mediaData ? mediaData.caption : content,
      messageType: mediaData ? mediaData.type : 'text',
      mediaUrl: mediaData?.url || null,
      mediaName: mediaData?.name || null,
      isDelivered: false,
      isRead: false,
      createdAt: new Date().toISOString(),
      status: 'sending',
      replyTo: replyTo ? {
        senderName: replyTo.sender?.name || 'Unknown',
        content: replyTo.content,
      } : null,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setReplyTo(null);

    try {
      const serverMessage = await socketService._sendMessagePromise?.(
        selectedUser.id, content, optimisticMessage.messageType, mediaData, replyTo?.id
      ) || await new Promise((resolve, reject) => {
        socketService.emit('send-message', {
          receiverId: selectedUser.id,
          content,
          messageType: optimisticMessage.messageType,
          mediaUrl: mediaData?.url,
          mediaName: mediaData?.name,
          replyToId: replyTo?.id,
        }, (response) => {
          if (response?.status === 'ok') resolve(response.data);
          else reject(response?.message || 'Failed to send');
        });
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...serverMessage, status: 'sent' } : msg
        )
      );
    } catch (error) {
      console.error('Failed to send:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, status: 'failed' } : msg
        )
      );
    }
  };

  const handleTyping = (typing) => {
    if (typing) socketService.emit('typing-start', { receiverId: selectedUser.id });
    else socketService.emit('typing-stop', { receiverId: selectedUser.id });
  };

  const handleDeleteMessage = async (messageId, forEveryone = false) => {
    try {
      await messageAPI.deleteMessage(messageId);
      if (forEveryone) {
        socketService.emit('delete-message', { messageId, forEveryone: true });
      }
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-600 dark:text-gray-300 mb-2">Select a chat</h2>
          <p className="text-gray-500 dark:text-gray-400">Choose a user to start messaging</p>
        </div>
      </div>
    );
  }

  const isUserOnline = onlineUsers.includes(selectedUser.id);

  return (
    <div className="flex-1 flex flex-col h-screen dark:bg-gray-900">
      {/* ── Chat Header ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={onBack}
          className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <UserAvatar user={selectedUser} showOnline />

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-800 dark:text-white truncate">{selectedUser.name}</h2>
          <p className="text-xs truncate">
            {isUserOnline
              ? <span className="text-green-500 font-medium">● Online</span>
              : <span className="text-gray-400 dark:text-gray-500">
                  Last seen {new Date(selectedUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            }
          </p>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Messages Area ────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-1"
        style={{ backgroundColor: isDark ? '#0d1117' : '#e5ddd5' }}
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center mt-16">
            <p className="text-gray-400 dark:text-gray-500 text-sm">No messages yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Start the conversation! 👋</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isSent={msg.sender.id === user.id}
              onDelete={handleDeleteMessage}
              onReply={setReplyTo}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Typing Indicator ─────────────────────────────────────── */}
      {isTyping && <TypingIndicator userName={selectedUser.name} />}

      {/* ── Message Input ─────────────────────────────────────────── */}
      <MessageInput
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  );
};

export default ChatWindow;