import { useState, useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import { useRoomStore } from './stores/roomStore';
import { useWebSocketStore } from './stores/websocketStore';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore, type AuthStore } from './stores/authStore';
import TitleScreen from './components/TitleScreen';
import GameSettings from './components/GameSettings';
import GameBoard from './components/GameBoard';
import RoomLobby from './components/RoomLobby';
import RoomCodeInput from './components/RoomCodeInput';
import MatchmakingQueue from './components/MatchmakingQueue';
import CreateRoomForm from './components/CreateRoomForm';
import ConnectionIndicator from './components/ConnectionIndicator';

type GameMode = 'single' | 'local' | 'createRoom' | 'joinRoom' | 'matchmaking' | null;

/**
 * Extract room code from URL path or query parameter
 * Supports: /ABC123, /?room=ABC123, or /#ABC123
 */
function getRoomCodeFromUrl(): string | null {
  // Check path (e.g., /ABC123)
  const pathCode = window.location.pathname.slice(1).toUpperCase();
  if (pathCode.length === 6 && /^[A-Z0-9]+$/.test(pathCode)) {
    return pathCode;
  }
  
  // Check query parameter (e.g., ?room=ABC123)
  const params = new URLSearchParams(window.location.search);
  const queryCode = params.get('room')?.toUpperCase();
  if (queryCode && queryCode.length === 6 && /^[A-Z0-9]+$/.test(queryCode)) {
    return queryCode;
  }
  
  // Check hash (e.g., #ABC123)
  const hashCode = window.location.hash.slice(1).toUpperCase();
  if (hashCode.length === 6 && /^[A-Z0-9]+$/.test(hashCode)) {
    return hashCode;
  }
  
  return null;
}

/**
 * Clear room code from URL without page reload
 */
function clearRoomCodeFromUrl(): void {
  const url = new URL(window.location.href);
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  window.history.replaceState({}, '', url.toString());
}

function App() {
  const { gameState, startRound, error, clearError, loading, gameId } = useGameStore();
  const { room: roomState } = useRoomStore();
  const { getThemeConfig, reduceMotion } = useThemeStore();
  const checkSession = useAuthStore((state: AuthStore) => state.checkSession);
  const themeConfig = getThemeConfig();
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [roundStarted, setRoundStarted] = useState(false);
  const [multiplayerMode, setMultiplayerMode] = useState<'lobby' | 'create' | 'join' | 'matchmaking' | null>(null);
  const [urlRoomCode, setUrlRoomCode] = useState<string | null>(null);

  // Check for existing auth session on app load
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Always apply dark mode class to document
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Apply reduce motion class when enabled
  useEffect(() => {
    if (reduceMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [reduceMotion]);

  // Check URL for room code on app load
  useEffect(() => {
    const roomCode = getRoomCodeFromUrl();
    if (roomCode) {
      setUrlRoomCode(roomCode);
      setMultiplayerMode('join');
    }
  }, []);

  // Connect WebSocket when entering multiplayer mode
  useEffect(() => {
    if (multiplayerMode) {
      const wsStore = useWebSocketStore.getState();
      if (!wsStore.socket || !wsStore.connected) {
        wsStore.connect();
      }
    }
  }, [multiplayerMode]);

  // Watch for game state changes and transition to game when appropriate
  useEffect(() => {
    if (gameState && (gameState.gameStatus === 'playing' || gameState.gameStatus === 'roundEnd' || gameState.gameStatus === 'gameEnd')) {
      if (!gameStarted) {
        setGameStarted(true);
      }
    }
  }, [gameState, gameStarted]);

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
    useGameStore.getState().reset();
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

  const bgGradient = themeConfig.bgGradient;
  const screenClass = 'h-full overflow-hidden';

  // Show title screen
  if (!gameStarted && !gameMode && !multiplayerMode) {
    return (
      <div className={`${screenClass} ${bgGradient} p-3 sm:p-4 pt-safe pb-safe transition-colors duration-300 flex flex-col`}>
        <div className="container mx-auto flex-1 flex flex-col min-h-0">
          <TitleScreen onSelectMode={(mode) => handleSelectMode(mode as GameMode)} />
        </div>
      </div>
    );
  }

  // Show multiplayer room creation
  if (multiplayerMode === 'create') {
    return (
      <div className={`${screenClass} ${bgGradient} p-3 sm:p-4 pt-safe pb-safe transition-colors duration-300 flex flex-col`}>
        <ConnectionIndicator />
        <div className="container mx-auto flex-1 flex flex-col min-h-0">
          <CreateRoomForm onBack={() => setMultiplayerMode(null)} />
        </div>
      </div>
    );
  }

  // Show join room input
  if (multiplayerMode === 'join') {
    return (
      <div className={`${screenClass} ${bgGradient} p-3 sm:p-4 pt-safe pb-safe transition-colors duration-300 flex flex-col`}>
        <ConnectionIndicator />
        <div className="container mx-auto flex-1 flex flex-col min-h-0">
          <RoomCodeInput
            initialCode={urlRoomCode || undefined}
            onJoin={(_code) => {
              // Room joined, will show lobby via useEffect
              clearRoomCodeFromUrl();
              setUrlRoomCode(null);
            }}
            onCancel={() => {
              setMultiplayerMode(null);
              clearRoomCodeFromUrl();
              setUrlRoomCode(null);
            }}
          />
        </div>
      </div>
    );
  }

  // Show matchmaking queue
  if (multiplayerMode === 'matchmaking') {
    return (
      <div className={`${screenClass} ${bgGradient} p-3 sm:p-4 pt-safe pb-safe transition-colors duration-300 flex flex-col`}>
        <ConnectionIndicator />
        <div className="container mx-auto flex-1 flex flex-col min-h-0">
          <MatchmakingQueue onCancel={() => setMultiplayerMode(null)} />
        </div>
      </div>
    );
  }

  // Show room lobby (but not if game has started)
  if (multiplayerMode === 'lobby' && roomState && !gameStarted) {
    return (
      <div className={`${screenClass} ${bgGradient} p-3 sm:p-4 pt-safe pb-safe transition-colors duration-300 flex flex-col`}>
        <ConnectionIndicator />
        <div className="container mx-auto flex-1 flex flex-col min-h-0">
          <RoomLobby onBack={() => {
            setMultiplayerMode(null);
            setGameStarted(false);
            useRoomStore.getState().reset();
            useGameStore.getState().reset();
          }} />
        </div>
      </div>
    );
  }

  // Show game settings for single/local
  if (!gameStarted && gameMode && ['single', 'local'].includes(gameMode)) {
    return (
      <div className={`${screenClass} ${bgGradient} p-3 sm:p-4 pt-safe pb-safe transition-colors duration-300 flex flex-col`}>
        <div className="container mx-auto flex-1 flex flex-col min-h-0">
          <GameSettings
            mode={gameMode === 'single' ? 'single' : 'local'}
            onStart={handleGameStart}
            onBack={() => setGameMode(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${screenClass} ${bgGradient} p-1 sm:p-2 pt-safe pb-safe transition-colors duration-300 flex flex-col`}>
      {/* Only show connection indicator for multiplayer modes */}
      {multiplayerMode && <ConnectionIndicator />}
      <div className="container mx-auto flex-1 flex flex-col min-h-0">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-center mb-0.5 flex-shrink-0 text-white">Flip 7</h1>
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
          <div className="flex-1 min-h-0 flex flex-col">
            <GameBoard onNewGame={handleNewGame} onBack={handleNewGame} />
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

