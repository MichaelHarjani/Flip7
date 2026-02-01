import { getAvatarById, getAvatarColor } from '../utils/avatars';

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isAI?: boolean;
  className?: string;
  avatarId?: string; // Predefined avatar ID
  avatarUrl?: string; // Custom avatar URL (for Google sign-in, etc.)
}

// Generate a consistent color based on the name
function getColorFromName(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];

  // Simple hash function to get consistent color for same name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Get initials from name (up to 2 characters)
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const sizeClasses = {
  xs: 'w-4 h-4 text-[8px]',
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

export default function Avatar({ name, size = 'md', isAI = false, className = '', avatarId, avatarUrl }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  // If there's a custom avatar URL (e.g., from Google), use it
  if (avatarUrl) {
    return (
      <div
        className={`
          ${sizeClass}
          rounded-full
          flex items-center justify-center
          flex-shrink-0
          ring-2 ring-white/20
          overflow-hidden
          ${className}
        `}
        title={name}
      >
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  // If there's a predefined avatar ID, use the emoji
  const predefinedAvatar = avatarId ? getAvatarById(avatarId) : undefined;
  if (predefinedAvatar) {
    const bgColor = getAvatarColor(avatarId!);
    return (
      <div
        className={`
          ${sizeClass}
          ${bgColor}
          rounded-full
          flex items-center justify-center
          flex-shrink-0
          ring-2 ring-white/20
          ${className}
        `}
        title={name}
      >
        <span className="text-[0.8em]">{predefinedAvatar.emoji}</span>
      </div>
    );
  }

  // Default: use initials
  const bgColor = getColorFromName(name);
  const initials = getInitials(name);

  return (
    <div
      className={`
        ${sizeClass}
        ${bgColor}
        rounded-full
        flex items-center justify-center
        font-bold text-white
        flex-shrink-0
        ring-2 ring-white/20
        ${isAI ? 'ring-purple-400/50' : ''}
        ${className}
      `}
      title={name}
    >
      {isAI ? (
        <span className="text-[0.7em]">🤖</span>
      ) : (
        initials
      )}
    </div>
  );
}
