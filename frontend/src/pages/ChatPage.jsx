import { useState } from 'react';
import ChatList from '../components/Chat/ChatList';
import ChatWindow from '../components/Chat/ChatWindow';

const ChatPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showChat, setShowChat] = useState(false);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setShowChat(true); // Show chat window on mobile
  };

  const handleBackToList = () => {
    setShowChat(false);
    setSelectedUser(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Chat List - Hidden on mobile when chat is open */}
      <div className={`
        w-full md:w-96 
        ${showChat ? 'hidden md:block' : 'block'}
      `}>
        <ChatList 
          selectedUser={selectedUser} 
          onSelectUser={handleSelectUser} 
        />
      </div>

      {/* Chat Window - Hidden on mobile when no chat selected */}
      <div className={`
        flex-1
        ${showChat ? 'block' : 'hidden md:block'}
      `}>
        <ChatWindow 
          selectedUser={selectedUser}
          onBack={handleBackToList}
        />
      </div>
    </div>
  );
};

export default ChatPage;