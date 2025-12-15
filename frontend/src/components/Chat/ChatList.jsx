import { useState, useEffect } from 'react';
import { messageAPI, userAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import UserAvatar from '../Common/UserAvatar';
import { formatTimestamp } from '../../utils/helpers';

const ChatList = ({ selectedUser, onSelectUser }) => {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await messageAPI.getConversations();
      setConversations(response.data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await userAPI.getUsers();
      setAllUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim()) {
      try {
        const response = await userAPI.searchUsers(query);
        setAllUsers(response.data.users);
        setShowNewChat(true);
      } catch (error) {
        console.error('Error searching users:', error);
      }
    } else {
      setShowNewChat(false);
      setAllUsers([]);
    }
  };

  const handleNewChat = () => {
    setShowNewChat(true);
    fetchAllUsers();
  };

  const handleSelectUser = (user) => {
    onSelectUser(user);
    setShowNewChat(false);
    setSearchQuery('');
  };

  const displayList = showNewChat ? allUsers : conversations;

  return (
    <div className="w-full h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="bg-primary p-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {showNewChat ? (
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setSearchQuery('');
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
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
            ) : (
              <UserAvatar user={user} size="lg" />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold truncate">
                {showNewChat ? 'New Chat' : user.name}
              </h2>
              {!showNewChat && (
                <p className="text-xs text-gray-200 truncate">Online</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!showNewChat && (
              <button
                onClick={handleNewChat}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
                title="New chat"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>Logout</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder={showNewChat ? "Search users..." : "Search..."}
            className="w-full px-4 py-2 pl-10 rounded-lg text-gray-800 outline-none"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : showNewChat ? (
          // New chat - show all users
          allUsers.length === 0 ? (
            <div className="text-center text-gray-500 mt-8 px-4">
              No users found
            </div>
          ) : (
            allUsers.map((u) => (
              <div
                key={u.id}
                onClick={() => handleSelectUser(u)}
                className="flex items-center gap-3 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition"
              >
                <UserAvatar user={u} showOnline />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">
                    {u.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {u.email || u.mobile}
                  </p>
                </div>
              </div>
            ))
          )
        ) : (
          // Show conversations
          conversations.length === 0 ? (
            <div className="text-center text-gray-500 mt-8 px-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto mb-4 text-gray-300"
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
              <p className="mb-2">No conversations yet</p>
              <button
                onClick={handleNewChat}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition"
              >
                Start a chat
              </button>
            </div>
          ) : (
            conversations.map((conv) => {
              const isOnline = onlineUsers.includes(conv.user.id);
              const isLastMessageMine = conv.lastMessage?.senderId === user.id;
              
              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectUser(conv.user)}
                  className={`flex items-center gap-3 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                    selectedUser?.id === conv.user.id ? 'bg-gray-100' : ''
                  }`}
                >
                  <UserAvatar user={{ ...conv.user, isOnline }} showOnline />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {conv.user.name}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatTimestamp(conv.lastMessageTime)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.lastMessage?.messageType === 'image' ? (
                        <span className="flex items-center gap-1">
                          📷 Photo
                        </span>
                      ) : conv.lastMessage?.messageType === 'video' ? (
                        <span className="flex items-center gap-1">
                          🎥 Video
                        </span>
                      ) : (
                        <span>
                          {isLastMessageMine && '✓ '}
                          {conv.lastMessage?.content}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
};

export default ChatList;