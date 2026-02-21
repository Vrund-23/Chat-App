import { useState, useRef, useEffect } from 'react';
import { fileAPI } from '../../services/api';

const MessageInput = ({ onSendMessage, onTyping, replyTo, onCancelReply }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input when reply is set
  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 1000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileType = file.type.startsWith('image/') ? 'image'
      : file.type.startsWith('video/') ? 'video' : 'file';
    setSelectedMedia({ file, type: fileType, name: file.name });
    const reader = new FileReader();
    reader.onload = (ev) => setMediaPreview(ev.target.result);
    reader.readAsDataURL(file);
    setShowMediaPicker(false);
  };

  const handleSendMedia = async () => {
    if (!selectedMedia) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedMedia.file);
      const response = await fileAPI.uploadMedia(formData);
      const fileUrl = `http://localhost:5000${response.data.filePath}`;
      onSendMessage(message, {
        type: selectedMedia.type,
        url: fileUrl,
        name: selectedMedia.name,
        caption: message,
      });
      setSelectedMedia(null);
      setMediaPreview(null);
      setMessage('');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedMedia) {
      handleSendMedia();
    } else if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
    if (isTyping) {
      setIsTyping(false);
      onTyping(false);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  useEffect(() => {
    return () => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); };
  }, []);

  const canSend = (message.trim() || selectedMedia) && !uploading;

  return (
    <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">

      {/* ── Reply Preview Bar ─────────────────────────────────────── */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
          <div className="flex-1 border-l-4 border-primary pl-2">
            <p className="text-xs font-semibold text-primary dark:text-tertiary">
              {replyTo.sender?.name || 'Unknown'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {replyTo.content || '📎 Attachment'}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Media Preview ─────────────────────────────────────────── */}
      {selectedMedia && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {selectedMedia.type === 'image' ? (
                <img src={mediaPreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
              ) : selectedMedia.type === 'video' ? (
                <video src={mediaPreview} className="w-16 h-16 object-cover rounded-lg" />
              ) : (
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{selectedMedia.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedMedia.type.toUpperCase()}</p>
            </div>
            <button
              onClick={() => { setSelectedMedia(null); setMediaPreview(null); }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-full transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Input Row ─────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="p-3">
        <div className="flex gap-2 items-end">

          {/* Attachment */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMediaPicker(!showMediaPicker)}
              className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            {showMediaPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-700 rounded-xl shadow-xl border border-gray-100 dark:border-gray-600 py-2 w-40 z-20">
                <button
                  type="button"
                  onClick={() => { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click(); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                >
                  🖼️ Photo
                </button>
                <button
                  type="button"
                  onClick={() => { fileInputRef.current.accept = 'video/*'; fileInputRef.current.click(); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                >
                  🎥 Video
                </button>
                <button
                  type="button"
                  onClick={() => { fileInputRef.current.accept = '*/*'; fileInputRef.current.click(); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                >
                  📎 File
                </button>
              </div>
            )}
            <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
          </div>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleChange}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit(e)}
            placeholder={selectedMedia ? 'Add a caption...' : replyTo ? `Replying to ${replyTo.sender?.name}...` : 'Type a message...'}
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 dark:text-white text-sm"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!canSend}
            className={`p-2.5 rounded-full transition-all flex-shrink-0 ${
              canSend
                ? 'bg-primary hover:bg-secondary text-white shadow-md hover:shadow-lg scale-100 hover:scale-105'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;