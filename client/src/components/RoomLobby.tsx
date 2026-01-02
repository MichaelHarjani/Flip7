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
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!room) {
    return null;
  }

  // Generate shareable URL
  const shareUrl = `${window.location.origin}/${room.roomCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleStartGame = () => {
    console.log('Start Game button clicked', { isHost, loading, players: room.players.length, status: room.status });
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
        <div className="space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
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
          
          {/* Shareable URL */}
          <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
            <div className="text-sm text-gray-400 mb-1">Share this link with friends:</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-blue-400 text-sm break-all">{shareUrl}</code>
              <button
                onClick={handleCopyUrl}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors whitespace-nowrap"
              >
                {copiedUrl ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <PlayerList players={room.players} currentSessionId={sessionId} />
      </div>

      <div className="mb-4">
        <div className="text-sm text-gray-300">
          Players: {room.players.length}
          {room.players.length >= 10 && (
            <span className="ml-2 text-blue-400">
              ({Math.ceil(room.players.length / 10)} deck{Math.ceil(room.players.length / 10) > 1 ? 's' : ''} in play)
            </span>
          )}
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

      {/* Debug info - remove after testing */}
      <div className="mb-2 text-xs text-gray-500">
        Debug: isHost={String(isHost)}, loading={String(loading)}, players={room.players.length}, status={room.status}
        <br />
        Button disabled: {String(loading || room.players.length < 2 || room.status !== 'waiting')}
        <br />
        Disabled reasons: loading={String(loading)}, playersLessThan2={String(room.players.length < 2)}, statusNotWaiting={String(room.status !== 'waiting')}
      </div>

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

