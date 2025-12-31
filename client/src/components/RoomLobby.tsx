import { useState, useEffect } from 'react';
import { useRoomStore } from '../stores/roomStore';
import { useWebSocketStore } from '../stores/websocketStore';
import { useGameStore } from '../stores/gameStore';
import PlayerList from './PlayerList';

interface RoomLobbyProps {
  onBack: () => void;
}

export default function RoomLobby({ onBack }: RoomLobbyProps) {
  const { room, sessionId, isHost, loading, error, startGame, leaveRoom, clearError } = useRoomStore();
  const { connected } = useWebSocketStore();
  const { setGameState } = useGameStore();
  const [copied, setCopied] = useState(false);

  if (!room) {
    return null;
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    startGame();
  };

  const handleLeave = () => {
    leaveRoom();
    onBack();
  };

  // Listen for game state updates
  useEffect(() => {
    const wsStore = useWebSocketStore.getState();
    const handleGameState = (data: { gameState: any }) => {
      setGameState(data.gameState);
    };
    
    wsStore.on('game:state', handleGameState);
    
    return () => {
      wsStore.off('game:state', handleGameState);
    };
  }, [setGameState]);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 border-4 border-gray-600 rounded-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Room Lobby</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-300">Room Code:</span>
            <span className="text-2xl font-bold text-white tracking-widest">{room.roomCode}</span>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-300">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <PlayerList players={room.players} currentSessionId={sessionId} />
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-300">
          Players: {room.players.length} / {room.maxPlayers}
        </div>
        {room.players.length < 2 && (
          <div className="text-sm text-yellow-400 mt-1">
            Need at least 2 players to start
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900 border-2 border-red-600 rounded text-red-100 text-sm">
          {error}
          <button
            onClick={clearError}
            className="ml-2 text-red-200 hover:text-red-100 font-bold"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex gap-3">
        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={loading || room.players.length < 2 || room.status !== 'waiting'}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
          >
            {loading ? 'Starting...' : 'Start Game'}
          </button>
        )}
        <button
          onClick={handleLeave}
          disabled={loading}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}

