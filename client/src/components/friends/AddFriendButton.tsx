import { useState } from 'react';
import { useFriendsStore } from '../../stores/friendsStore';
import { useAuthStore } from '../../stores/authStore';
import { UserPlus, Check, Loader2 } from 'lucide-react';

interface AddFriendButtonProps {
  userId: string;
  username: string;
  className?: string;
}

export default function AddFriendButton({ userId, username, className = '' }: AddFriendButtonProps) {
  const { isGuest } = useAuthStore();
  const { sendRequest, friends } = useFriendsStore();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already friends
  const isAlreadyFriend = friends.some(f => f.friendUserId === userId);

  if (isGuest || isAlreadyFriend) {
    return null;
  }

  const handleClick = async () => {
    setSending(true);
    setError(null);

    const result = await sendRequest(userId);

    setSending(false);

    if (result.success) {
      setSent(true);
    } else {
      setError(result.error || 'Failed to send request');
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  };

  if (sent) {
    return (
      <div className={`flex items-center gap-1 text-green-400 text-sm ${className}`}>
        <Check size={14} />
        <span>Request sent</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={sending}
      className={`flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white text-sm rounded transition-colors ${className}`}
      title={`Add ${username} as friend`}
    >
      {sending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <UserPlus size={14} />
      )}
      <span>Add</span>
    </button>
  );
}
