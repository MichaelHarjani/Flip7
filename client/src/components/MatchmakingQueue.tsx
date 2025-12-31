import { useState, useEffect } from 'react';
import { useRoomStore } from '../stores/roomStore';

interface MatchmakingQueueProps {
  onCancel: () => void;
}

export default function MatchmakingQueue({ onCancel }: MatchmakingQueueProps) {
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const { loading, error, startMatchmaking, clearError, room } = useRoomStore();

  useEffect(() => {
    // If we got a room, we're matched
    if (room) {
      // Component will be replaced by RoomLobby
    }
  }, [room]);

  const handleStart = async () => {
    if (name.trim()) {
      clearError();
      await startMatchmaking(name.trim(), maxPlayers);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-800 border-4 border-gray-600 rounded-lg">
      <h2 className="text-2xl font-bold text-white mb-4">Find Match</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="w-full px-4 py-2 bg-gray-700 border-2 border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            placeholder="Enter your name"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Max Players
          </label>
          <select
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-700 border-2 border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            disabled={loading}
          >
            <option value={2}>2 Players</option>
            <option value={3}>3 Players</option>
            <option value={4}>4 Players</option>
            <option value={5}>5 Players</option>
            <option value={6}>6 Players</option>
          </select>
        </div>

        {error && (
          <div className="p-3 bg-red-900 border-2 border-red-600 rounded text-red-100 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="p-4 bg-blue-900 border-2 border-blue-600 rounded text-blue-100 text-center">
            <div className="mb-2">Searching for players...</div>
            <div className="text-sm">This may take a moment</div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleStart}
            disabled={loading || !name.trim()}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {loading ? 'Searching...' : 'Find Match'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

