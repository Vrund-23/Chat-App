const MessageStatus = ({ status, isOwnMessage }) => {
  if (!isOwnMessage) return null;

  if (status === 'sent') return <span className="text-gray-400">✓</span>; // Single tick
  if (status === 'delivered') return <span className="text-gray-400">✓✓</span>; // Double tick (Grey)
  if (status === 'read') return <span className="text-blue-500">✓✓</span>; // Blue tick

  return <span className="text-gray-400">🕒</span>; // Pending
};