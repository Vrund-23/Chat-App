import { useState } from 'react';
import { formatMessageTime } from '../../utils/helpers';

const MessageItem = ({ message, isSent, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = (forEveryone = false) => {
    onDelete(message.id, forEveryone);
    setShowMenu(false);
  };

  // Check if message is within 7 days for "delete for everyone"
  const canDeleteForEveryone = () => {
    const messageDate = new Date(message.createdAt);
    const now = new Date();
    const diffInDays = (now - messageDate) / (1000 * 60 * 60 * 24);
    return isSent && diffInDays < 7;
  };

  // Render message status icons
  const renderStatusIcon = () => {
    if (!isSent) return null;

    if (message.isRead) {
      // Double blue tick (Read)
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-blue-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
          <path
            fillRule="evenodd"
            d="M14.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
            transform="translate(2, 0)"
          />
        </svg>
      );
    } else if (message.isDelivered) {
      // Double gray tick (Delivered)
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
          <path
            fillRule="evenodd"
            d="M14.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
            transform="translate(2, 0)"
          />
        </svg>
      );
    } else {
      // Single gray tick (Sent)
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
  };

  return (
    <div
      className={`flex ${isSent ? 'justify-end' : 'justify-start'} slide-up relative group`}
    >
      <div
        className={`max-w-xs lg:max-w-md rounded-lg shadow-sm relative ${
          isSent
            ? 'bg-green-100 text-gray-800'
            : 'bg-white text-gray-800'
        }`}
      >
        {/* Message content */}
        <div className="px-3 py-2">
          {message.messageType === 'image' && (
            <img
              src={message.mediaUrl}
              alt="Shared"
              className="rounded-lg mb-2 max-w-full h-auto"
            />
          )}
          {message.messageType === 'video' && (
            <video
              src={message.mediaUrl}
              controls
              className="rounded-lg mb-2 max-w-full"
            />
          )}
          {message.content && (
            <p className="break-words whitespace-pre-wrap">{message.content}</p>
          )}
          
          {/* Time and status */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs text-gray-500">
              {formatMessageTime(message.createdAt)}
            </span>
            {renderStatusIcon()}
          </div>
        </div>

        {/* Context Menu Button */}
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="absolute top-1 right-1 p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Context Menu */}
        {showMenu && (
          <div className={`absolute ${isSent ? 'right-0' : 'left-0'} mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-10`}>
            <button
              onClick={() => handleDelete(false)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-gray-700"
            >
              Delete for me
            </button>
            {canDeleteForEveryone() && (
              <button
                onClick={() => handleDelete(true)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
              >
                Delete for everyone
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;