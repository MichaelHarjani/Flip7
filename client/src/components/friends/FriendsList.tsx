import { useFriendsStore, type Friend } from '../../stores/friendsStore';
import Avatar from '../Avatar';
import { UserMinus, Gamepad2 } from 'lucide-react';

interface FriendsListProps {
  onInvite?: (friendUserId: string) => void;
}

export default function FriendsList({ onInvite }: FriendsListProps) {
  const { friends, removeFriend } = useFriendsStore();

  if (friends.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No friends yet.</p>
        <p className="text-sm mt-1">Search for players to add them!</p>
      </div>
    );
  }

  // Sort by online status, then by username
  const sortedFriends = [...friends].sort((a, b) => {
    if (a.isOnline !== b.isOnline) {
      return a.isOnline ? -1 : 1;
    }
    return a.friendUsername.localeCompare(b.friendUsername);
  });

  const handleRemove = async (friend: Friend) => {
    if (confirm(`Remove ${friend.friendUsername} from friends?`)) {
      await removeFriend(friend.id);
    }
  };

  return (
    <div className="space-y-2">
      {sortedFriends.map((friend) => (
        <div
          key={friend.id}
          className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <div className="relative">
            <Avatar
              name={friend.friendUsername}
              avatarId={friend.friendAvatarId}
              avatarUrl={friend.friendAvatarUrl}
              size="md"
            />
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-800 ${
                friend.isOnline ? 'bg-green-500' : 'bg-gray-500'
              }`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">
              {friend.friendUsername}
            </div>
            <div className={`text-xs ${friend.isOnline ? 'text-green-400' : 'text-gray-400'}`}>
              {friend.isOnline ? 'Online' : 'Offline'}
            </div>
          </div>

          <div className="flex gap-1">
            {onInvite && friend.isOnline && (
              <button
                onClick={() => onInvite(friend.friendUserId)}
                className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                title="Invite to game"
              >
                <Gamepad2 size={18} />
              </button>
            )}
            <button
              onClick={() => handleRemove(friend)}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
              title="Remove friend"
            >
              <UserMinus size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
