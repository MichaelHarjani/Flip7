interface ActiveSession {
  sessionId: string;
  playerId: string;
  playerName: string;
  roomCode: string;
  gameId: string | null;
  isHost: boolean;
  connected: boolean;
  lastSeen: string;
  roomStatus: 'waiting' | 'playing' | 'ended';
}

interface RejoinGameDialogProps {
  activeSessions: ActiveSession[];
  onRejoin: (session: ActiveSession) => void;
  onDismiss: () => void;
  onDismissSession: (sessionId: string) => void;
  loading?: boolean;
}

export default function RejoinGameDialog({
  activeSessions,
  onRejoin,
  onDismiss,
  onDismissSession,
  loading = false,
}: RejoinGameDialogProps) {
  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-600 text-yellow-100">
            Waiting
          </span>
        );
      case 'playing':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-600 text-green-100">
            In Progress
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-600 text-gray-100">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-scale-in">
      <div className="bg-gray-800 rounded-2xl shadow-2xl border-4 border-gray-600 max-w-md w-full p-6 animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Welcome Back!</h2>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-white text-3xl leading-none transition-colors"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <p className="text-gray-300 mb-6">
          You have {activeSessions.length} active game{activeSessions.length > 1 ? 's' : ''} you can rejoin:
        </p>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {activeSessions.map((session) => (
            <div
              key={session.sessionId}
              className="bg-gray-700 rounded-xl p-4 border-2 border-gray-600 hover:border-blue-500 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-lg">
                      Room {session.roomCode}
                    </span>
                    {getStatusBadge(session.roomStatus)}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    Playing as <span className="text-white font-medium">{session.playerName}</span>
                    {session.isHost && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-purple-600 text-purple-100 rounded-full">
                        Host
                      </span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Last active: {formatLastSeen(session.lastSeen)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => onRejoin(session)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
                >
                  {loading ? 'Rejoining...' : 'Rejoin'}
                </button>
                <button
                  onClick={() => onDismissSession(session.sessionId)}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  title="Don't rejoin this game"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-600">
          <button
            onClick={onDismiss}
            disabled={loading}
            className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg font-medium transition-colors"
          >
            Start Fresh Instead
          </button>
        </div>
      </div>
    </div>
  );
}

export type { ActiveSession };
