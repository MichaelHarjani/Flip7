import { useState, useCallback } from 'react';
import { useFriendsStore, type SearchUser } from '../../stores/friendsStore';
import Avatar from '../Avatar';
import { Search, UserPlus, Check, Loader2 } from 'lucide-react';

export default function FriendSearch() {
  const { searchUsers, sendRequest, friends } = useFriendsStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  // Debounced search
  const handleSearch = useCallback(async (value: string) => {
    setQuery(value);

    if (value.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    const users = await searchUsers(value);
    setResults(users);
    setSearching(false);
  }, [searchUsers]);

  const handleSendRequest = async (userId: string) => {
    setSending(userId);
    const result = await sendRequest(userId);
    setSending(null);

    if (result.success) {
      setSentRequests(prev => new Set([...prev, userId]));
    } else {
      alert(result.error || 'Failed to send request');
    }
  };

  // Filter out users who are already friends
  const friendUserIds = new Set(friends.map(f => f.friendUserId));
  const filteredResults = results.filter(user => !friendUserIds.has(user.id));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by username..."
          className="w-full pl-10 pr-4 py-2 bg-gray-700 border-2 border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
        />
        {searching && (
          <Loader2
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
          />
        )}
      </div>

      {query.length >= 2 && (
        <div className="space-y-2">
          {filteredResults.length === 0 ? (
            <div className="text-center py-4 text-gray-400">
              {searching ? 'Searching...' : 'No users found'}
            </div>
          ) : (
            filteredResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
              >
                <Avatar
                  name={user.username}
                  avatarId={user.avatarId}
                  avatarUrl={user.avatarUrl}
                  size="md"
                />

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">
                    {user.username}
                  </div>
                </div>

                {sentRequests.has(user.id) ? (
                  <div className="flex items-center gap-1 text-green-400 text-sm">
                    <Check size={16} />
                    <span>Sent</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSendRequest(user.id)}
                    disabled={sending === user.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                  >
                    {sending === user.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <UserPlus size={14} />
                    )}
                    <span>Add</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
