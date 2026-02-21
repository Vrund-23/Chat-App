import { useState, useRef } from 'react';
import { formatMessageTime } from '../../utils/helpers';

const REACTIONS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

const MessageItem = ({ message, isSent, onDelete, onReply }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState(message.reactions || {});
  const holdTimer = useRef(null);

  // ─── Long-press on mobile ────────────────────────────────────────────────
  const handleTouchStart = () => {
    holdTimer.current = setTimeout(() => setShowReactions(true), 500);
  };
  const handleTouchEnd = () => clearTimeout(holdTimer.current);

  const handleReact = (emoji) => {
    setReactions(prev => {
      const count = prev[emoji] || 0;
      return { ...prev, [emoji]: count === 0 ? 1 : 0 };
    });
    setShowReactions(false);
  };

  const handleDelete = (forEveryone = false) => {
    onDelete(message.id, forEveryone);
    setShowMenu(false);
  };

  const canDeleteForEveryone = () => {
    const diffInDays = (new Date() - new Date(message.createdAt)) / 86400000;
    return isSent && diffInDays < 7;
  };

  // ─── Tick icons ──────────────────────────────────────────────────────────
  const renderStatusIcon = () => {
    if (!isSent) return null;
    if (message.status === 'sending') {
      return <div className="h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />;
    }
    if (message.status === 'failed') {
      return <span className="text-red-500 text-xs">!</span>;
    }
    const color = message.isRead ? 'text-blue-500' : 'text-gray-400';
    const showDouble = message.isDelivered || message.isRead;
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-5 ${color}`} viewBox="0 0 24 12" fill="currentColor">
        {showDouble && (
          <path d="M1 6l4 4L13 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        )}
        <path d={showDouble ? "M6 6l4 4 8-8" : "M2 6l4 4 8-8"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  };

  const bubbleBase = isSent
    ? 'bg-accent dark:bg-teal-800 text-gray-800 dark:text-gray-100 rounded-tr-none'
    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none';

  const activeReactions = Object.entries(reactions).filter(([, count]) => count > 0);

  return (
    <div
      className={`flex ${isSent ? 'justify-end' : 'justify-start'} slide-up relative group mb-1`}
      onMouseLeave={() => { setShowMenu(false); setShowReactions(false); }}
    >
      <div className="relative max-w-xs lg:max-w-md">

        {/* ── Reply Quote Preview ───────────────────────────────── */}
        {message.replyTo && (
          <div className={`text-xs px-3 py-1.5 mb-0.5 rounded-lg border-l-4 border-primary bg-black/5 dark:bg-white/10 truncate max-w-full`}>
            <span className="font-semibold text-primary dark:text-tertiary">
              {message.replyTo.senderName}
            </span>
            <p className="text-gray-600 dark:text-gray-300 truncate">{message.replyTo.content || '📎 Attachment'}</p>
          </div>
        )}

        {/* ── Bubble ───────────────────────────────────────────── */}
        <div
          className={`${bubbleBase} rounded-lg shadow-sm`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="px-3 py-2">
            {/* Media */}
            {message.messageType === 'image' && (
              <img src={message.mediaUrl} alt="Shared" className="rounded-lg mb-2 max-w-full h-auto cursor-pointer hover:opacity-90 transition" />
            )}
            {message.messageType === 'video' && (
              <video src={message.mediaUrl} controls className="rounded-lg mb-2 max-w-full" />
            )}
            {message.messageType === 'file' && (
              <a
                href={message.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-600 rounded-lg mb-2 hover:bg-gray-100 dark:hover:bg-gray-500 transition border border-gray-200 dark:border-gray-500"
              >
                <div className="bg-primary/10 p-2 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate dark:text-white">{message.mediaName || 'Attached File'}</p>
                  <p className="text-xs text-primary">Click to Open</p>
                </div>
              </a>
            )}

            {/* Text */}
            {message.content && (
              <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
            )}

            {/* Time + Status */}
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {formatMessageTime(message.createdAt)}
              </span>
              {renderStatusIcon()}
            </div>
          </div>
        </div>

        {/* ── Reactions Display ─────────────────────────────────── */}
        {activeReactions.length > 0 && (
          <div className={`flex gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
            {activeReactions.map(([emoji]) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-2 py-0.5 shadow-sm hover:scale-110 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* ── Hover Action Buttons ─────────────────────────────── */}
        <div className={`absolute top-0 ${isSent ? '-left-20' : '-right-20'} hidden group-hover:flex items-center gap-1`}>
          {/* Emoji React */}
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="p-1.5 bg-white dark:bg-gray-700 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            title="React"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {/* Reply */}
          <button
            onClick={() => onReply && onReply(message)}
            className="p-1.5 bg-white dark:bg-gray-700 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            title="Reply"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          {/* Menu */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 bg-white dark:bg-gray-700 rounded-full shadow hover:bg-gray-100 dark:hover:bg-gray-600 transition"
            title="More"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* ── Emoji Picker ─────────────────────────────────────── */}
        {showReactions && (
          <div className={`absolute ${isSent ? 'right-0' : 'left-0'} -top-12 flex gap-1 bg-white dark:bg-gray-700 rounded-full shadow-xl border border-gray-100 dark:border-gray-600 px-3 py-1.5 z-20`}>
            {REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* ── Context Menu ─────────────────────────────────────── */}
        {showMenu && (
          <div className={`absolute ${isSent ? 'right-0' : 'left-0'} mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-10`}>
            <button
              onClick={() => { onReply && onReply(message); setShowMenu(false); }}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Reply
            </button>
            <button
              onClick={() => handleDelete(false)}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete for me
            </button>
            {canDeleteForEveryone() && (
              <button
                onClick={() => handleDelete(true)}
                className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
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