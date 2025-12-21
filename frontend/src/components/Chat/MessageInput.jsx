import { useState, useRef, useEffect } from 'react';

const MessageInput = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping(false);
    }, 1000);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileType = file.type.startsWith('image/') ? 'image' : 
                     file.type.startsWith('video/') ? 'video' : 'file';

    setSelectedMedia({
      file,
      type: fileType,
      name: file.name,
    });

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    setShowMediaPicker(false);
  };

  const handleSendMedia = () => {
    if (selectedMedia) {
      // In a real app, you'd upload to a server first
      // For now, we'll use the local preview URL
      onSendMessage(message, {
        type: selectedMedia.type,
        url: mediaPreview,
        name: selectedMedia.name,
        caption: message,
      });

      setSelectedMedia(null);
      setMediaPreview(null);
      setMessage('');
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
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-gray-100 border-t border-gray-200">
      {/* Media Preview */}
      {selectedMedia && (
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {selectedMedia.type === 'image' ? (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ) : selectedMedia.type === 'video' ? (
                <video
                  src={mediaPreview}
                  className="w-20 h-20 object-cover rounded-lg"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">
                {selectedMedia.name}
              </p>
              <p className="text-xs text-gray-500">
                {selectedMedia.type.toUpperCase()}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedMedia(null);
                setMediaPreview(null);
              }}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex gap-2 items-end">
          {/* Attachment Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMediaPicker(!showMediaPicker)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full transition"
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

            {/* Media Picker Menu */}
            {showMediaPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg py-2 w-48">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current.accept = 'image/*';
                    fileInputRef.current.click();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current.accept = 'video/*';
                    fileInputRef.current.click();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <span>Video</span>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={message}
            onChange={handleChange}
            placeholder={selectedMedia ? "Add a caption..." : "Type a message..."}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!message.trim() && !selectedMedia}
            className="p-3 bg-primary text-white rounded-full hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default MessageInput;