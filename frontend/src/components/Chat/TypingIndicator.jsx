const TypingIndicator = ({ userName }) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-sm text-gray-600">
      <span>{userName} is typing</span>
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
      </div>
    </div>
  );
};

export default TypingIndicator;