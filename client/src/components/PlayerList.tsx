import type { PlayerSession } from '@shared/types/index';

interface PlayerListProps {
  players: PlayerSession[];
  currentSessionId: string | null;
}

export default function PlayerList({ players, currentSessionId }: PlayerListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-bold text-white mb-3">Players ({players.length})</h3>
      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.sessionId}
            className={`p-3 rounded-lg border-2 ${
              player.sessionId === currentSessionId
                ? 'bg-blue-600 border-blue-400'
                : 'bg-gray-700 border-gray-600'
            } ${!player.connected ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{player.name}</span>
                {player.isHost && (
                  <span className="px-2 py-1 text-xs bg-yellow-500 text-yellow-900 rounded font-bold">
                    HOST
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {player.connected ? (
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                ) : (
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                )}
                <span className="text-xs text-gray-300">
                  {player.connected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

