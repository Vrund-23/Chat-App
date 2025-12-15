import { getInitials, getAvatarColor } from '../../utils/helpers.js';

const UserAvatar = ({ user, size = 'md', showOnline = false }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  return (
    <div className="relative inline-block">
      {user.profileImage ? (
        <img
          src={user.profileImage}
          alt={user.name}
          className={`${sizeClasses[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${getAvatarColor(
            user.name
          )} rounded-full flex items-center justify-center text-white font-semibold`}
        >
          {getInitials(user.name)}
        </div>
      )}
      {showOnline && user.isOnline && (
        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
      )}
    </div>
  );
};

export default UserAvatar;