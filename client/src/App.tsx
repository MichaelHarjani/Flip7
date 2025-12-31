import { useState, useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import { useRoomStore } from './stores/roomStore';
import { useWebSocketStore } from './stores/websocketStore';
import TitleScreen from './components/TitleScreen';
import GameSettings from './components/GameSettings';
import GameBoard from './components/GameBoard';
import RoomLobby from './components/RoomLobby';
import RoomCodeInput from './components/RoomCodeInput';
import MatchmakingQueue from './components/MatchmakingQueue';
import CreateRoomForm from './components/CreateRoomForm';

type GameMode = 'single' | 'local' | 'createRoom' | 'joinRoom' | 'matchmaking' | null;

function App() {
  const { gameState, startRound, error, clearError, loading, gameId, setGameState } = useGameStore();
  const { room, connect } = useWebSocketStore();
  const { room: roomState } = useRoomStore();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [roundStarted, setRoundStarted] = useState(false);
  const [multiplayerMode, setMultiplayerMode] = useState<'lobby' | 'create' | 'join' | 'matchmaking' | null>(null);

  // Always apply dark mode class to document
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Connect WebSocket when entering multiplayer mode
  useEffect(() => {
    if (gameMode && ['createRoom', 'joinRoom', 'matchmaking'].includes(gameMode)) {
      const wsStore = useWebSocketStore.getState();
      if (!wsStore.socket || !wsStore.connected) {
        wsStore.connect();
      }
    }
  }, [gameMode]);

  // Listen for game state updates from WebSocket
  useEffect(() => {
    const wsStore = useWebSocketStore.getState();
    if (wsStore.socket) {
      const handleGameState = (data: { gameState: any }) => {
        setGameState(data.gameState);
        if (data.gameState && data.gameState.gameStatus === 'playing') {
          setGameStarted(true);
        }
      };

      wsStore.on('game:state', handleGameState);

      return () => {
        wsStore.off('game:state', handleGameState);
      };
    }
  }, [setGameState]);

  // Automatically start the first round when gameId becomes available and game is in 'waiting' status
  useEffect(() => {
    if (gameStarted && gameId && !roundStarted && gameState && gameState.gameStatus === 'waiting') {
      setRoundStarted(true);
      // Small delay to ensure game state is fully set
      setTimeout(() => {
        startRound();
      }, 100);
    }
  }, [gameStarted, gameId, roundStarted, gameState, startRound]);

  const handleGameStart = () => {
    setGameStarted(true);
    setRoundStarted(false);
  };

  const handleNewGame = () => {
    setGameStarted(false);
    setGameMode(null);
    setRoundStarted(false);
    setMultiplayerMode(null);
    useRoomStore.getState().reset();
  };

  const handleSelectMode = (mode: GameMode) => {
    if (mode === 'createRoom') {
      setMultiplayerMode('create');
    } else if (mode === 'joinRoom') {
      setMultiplayerMode('join');
    } else if (mode === 'matchmaking') {
      setMultiplayerMode('matchmaking');
    } else {
      setGameMode(mode);
    }
  };

  // Show room lobby when room is created/joined
  useEffect(() => {
    if (roomState && !gameStarted) {
      setMultiplayerMode('lobby');
    }
  }, [roomState, gameStarted]);

  const bgGradient = 'bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900';

  // Show title screen
  if (!gameStarted && !gameMode && !multiplayerMode) {
    return (
      <div className={`min-h-screen ${bgGradient} p-4 transition-colors duration-300`}>
        <div className="container mx-auto">
          <TitleScreen onSelectMode={handleSelectMode} />
        </div>
      </div>
    );
  }

  // Show multiplayer room creation
  if (multiplayerMode === 'create') {
    return (
      <div className={`min-h-screen ${bgGradient} p-4 transition-colors duration-300`}>
        <div className="container mx-auto">
          <CreateRoomForm onBack={() => setMultiplayerMode(null)} />
        </div>
      </div>
    );
  }

  // Show join room input
  if (multiplayerMode === 'join') {
    return (
      <div className={`min-h-screen ${bgGradient} p-4 transition-colors duration-300`}>
        <div className="container mx-auto">
          <RoomCodeInput 
            onJoin={(code) => {
              // Room joined, will show lobby via useEffect
            }}
            onCancel={() => setMultiplayerMode(null)}
          />
        </div>
      </div>
    );
  }

  // Show matchmaking queue
  if (multiplayerMode === 'matchmaking') {
    return (
      <div className={`min-h-screen ${bgGradient} p-4 transition-colors duration-300`}>
        <div className="container mx-auto">
          <MatchmakingQueue onCancel={() => setMultiplayerMode(null)} />
        </div>
      </div>
    );
  }

  // Show room lobby
  if (multiplayerMode === 'lobby' && roomState) {
    return (
      <div className={`min-h-screen ${bgGradient} p-4 transition-colors duration-300`}>
        <div className="container mx-auto">
          <RoomLobby onBack={() => {
            setMultiplayerMode(null);
            useRoomStore.getState().reset();
          }} />
        </div>
      </div>
    );
  }

  // Show game settings for single/local
  if (!gameStarted && gameMode && ['single', 'local'].includes(gameMode)) {
    return (
      <div className={`min-h-screen ${bgGradient} p-4 transition-colors duration-300`}>
        <div className="container mx-auto">
          <GameSettings 
            mode={gameMode} 
            onStart={handleGameStart}
            onBack={() => setGameMode(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen ${bgGradient} p-2 md:p-3 transition-colors duration-300 flex flex-col overflow-hidden`}>
      <div className="container mx-auto flex-1 flex flex-col min-h-0">
        <h1 className="text-xl md:text-2xl font-bold text-center mb-1 mt-1 flex-shrink-0 text-white">Flip 7</h1>
        {error && (
          <div className="border-2 px-4 py-2 rounded mb-2 flex justify-between items-center max-w-4xl mx-auto flex-shrink-0 text-sm bg-red-900 border-red-600 text-red-100">
            <span>{error}</span>
            <button 
              onClick={clearError} 
              className="font-bold text-lg text-red-200 hover:text-red-100"
            >
              ×
            </button>
          </div>
        )}
        {gameState ? (
          <div className="flex-1 min-h-0">
            <GameBoard onNewGame={handleNewGame} />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-6 text-center rounded-lg shadow-lg border-4 bg-gray-800 border-gray-600 text-white">
            <div className="mb-4 text-lg text-gray-300">
              {loading ? 'Loading game state...' : 'No game state available'}
            </div>
            {error && (
              <button
                onClick={() => {
                  clearError();
                  setGameStarted(false);
                  setGameMode(null);
                }}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
              >
                Go Back to Title Screen
              </button>
            )}
            {!error && !loading && (
              <div className="space-y-4">
                <p className="text-gray-400">Please start a new game.</p>
                <button
                  onClick={() => {
                    setGameStarted(false);
                    setGameMode(null);
                  }}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
                >
                  Start New Game
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

