import { useFriendsStore, type FriendRequest } from '../../stores/friendsStore';
import Avatar from '../Avatar';
import { Check, X } from 'lucide-react';

export default function FriendRequests() {
  const { requests, acceptRequest, declineRequest } = useFriendsStore();

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No pending requests.</p>
      </div>
    );
  }

  const handleAccept = async (request: FriendRequest) => {
    await acceptRequest(request.id);
  };

  const handleDecline = async (request: FriendRequest) => {
    await declineRequest(request.id);
  };

  return (
    <div className="space-y-2">
      {requests.map((request) => (
        <div
          key={request.id}
          className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
        >
          <Avatar
            name={request.fromUsername}
            avatarId={request.fromAvatarId}
            avatarUrl={request.fromAvatarUrl}
            size="md"
          />

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">
              {request.fromUsername}
            </div>
            <div className="text-xs text-gray-400">
              Sent {new Date(request.createdAt).toLocaleDateString()}
            </div>
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => handleAccept(request)}
              className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded transition-colors"
              title="Accept"
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => handleDecline(request)}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
              title="Decline"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
