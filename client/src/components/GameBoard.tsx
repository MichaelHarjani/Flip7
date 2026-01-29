import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useWebSocketStore } from '../stores/websocketStore';
import { useRoomStore } from '../stores/roomStore';
import { useThemeStore } from '../stores/themeStore';
import PlayerArea from './PlayerArea';
import ActionButtons from './ActionButtons';
import ActionCardButtons from './ActionCardButtons';
import ScoreDisplay from './ScoreDisplay';
import GameStats from './GameStats';
import confetti from 'canvas-confetti';
import { hasFlip7 } from '../utils/gameLogic';
import { playSound } from '../utils/sounds';

interface GameBoardProps {
  onNewGame?: () => void;
  onRematch?: () => void;
  onBack?: () => void;
}

export default function GameBoard({ onNewGame, onRematch, onBack }: GameBoardProps) {
  const { gameState, makeAIDecision, startNextRound, startRound, loading, error, setGameState } = useGameStore();
  const { roomCode } = useRoomStore();
  const { getThemeConfig } = useThemeStore();
  const themeConfig = getThemeConfig();
  const [aiThinkingPlayerId, setAiThinkingPlayerId] = useState<string | null>(null);
  const [lastAction, _setLastAction] = useState<string | null>(null);
  const maxThinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiDecisionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiProcessingRef = useRef<string | null>(null);
  const maxProcessingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [flip7Player, setFlip7Player] = useState<string | null>(null);
  const flip7ShownRef = useRef(false);
  const winSoundPlayedRef = useRef(false);
  const previousGameStateRef = useRef<typeof gameState>(null);
  const confettiIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedStateRef = useRef<string>(''); // Track last processed game state to detect changes
  const [screenShake, setScreenShake] = useState(false);

  // Get the local player's ID from room store (for multiplayer)
  const { roomCode: multiplayerRoomCode, getPlayerId } = useRoomStore();
  // IMPORTANT: Always read from sessionStorage to get the correct playerId for THIS tab
  const localPlayerId = getPlayerId();

  // Calculate current player before any early returns (for useEffect)
  const currentPlayer = gameState?.players?.[gameState.currentPlayerIndex];
  const humanPlayer = gameState?.players?.find(p => !p.isAI);
  const isRoundEnd = gameState?.gameStatus === 'roundEnd';

  // In multiplayer mode, only show actions for the local player when it's their turn
  // In single/local mode, show actions for any human player whose turn it is
  const isMultiplayer = !!multiplayerRoomCode;
  const localPlayer = isMultiplayer
    ? gameState?.players?.find(p => p.id === localPlayerId)
    : humanPlayer;

  // Debug logging for player identity - CRITICAL for debugging cross-tab issue
  if (isMultiplayer && gameState) {
    console.log('[GameBoard] Player identity lookup:', {
      myPlayerId: localPlayerId,
      allPlayers: gameState.players?.map(p => ({ id: p.id, name: p.name })),
      foundMyPlayer: localPlayer ? { id: localPlayer.id, name: localPlayer.name } : null,
      usingFallback: !localPlayer ? 'YES - will use first human player!' : 'NO',
    });
  }

  const isLocalPlayerTurn = isMultiplayer
    ? (currentPlayer?.id === localPlayerId)
    : (currentPlayer && !currentPlayer.isAI);
  const currentHumanPlayer = isLocalPlayerTurn ? currentPlayer : null;

  // Debug logging for multiplayer turn detection
  if (isMultiplayer && gameState) {
    console.log('[GameBoard] Multiplayer turn check:', {
      localPlayerId,
      currentPlayerId: currentPlayer?.id,
      currentPlayerName: currentPlayer?.name,
      isLocalPlayerTurn,
      localPlayerFound: !!localPlayer,
      allPlayerIds: gameState.players?.map(p => ({ id: p.id, name: p.name }))
    });
  }

  // Listen for WebSocket game state updates in multiplayer mode
  useEffect(() => {
    if (roomCode) {
      const wsStore = useWebSocketStore.getState();
      const handleGameState = (data: { gameState: any }) => {
        console.log('[GameBoard] Received game:state from server:', {
          players: data.gameState.players?.map((p: any) => ({ id: p.id, name: p.name })),
          myStoredPlayerId: getPlayerId(),
        });
        setGameState(data.gameState);
      };

      wsStore.on('game:state', handleGameState);

      return () => {
        wsStore.off('game:state', handleGameState);
      };
    }
  }, [roomCode, setGameState, getPlayerId]);

  // Handle AI turns - MUST be called before any early returns (Rules of Hooks)
  useEffect(() => {
    // If current player is not active or has busted, clear any processing state
    if (currentPlayer && (!currentPlayer.isActive || currentPlayer.hasBusted)) {
      if (aiProcessingRef.current === currentPlayer.id) {
        console.log(`[AI Turn] Player ${currentPlayer.id} is inactive or busted, clearing processing state`);
        aiProcessingRef.current = null;
        setAiThinkingPlayerId(null);
      }
    }
    
    if (
      gameState &&
      gameState.gameStatus === 'playing' &&
      currentPlayer &&
      currentPlayer.isAI &&
      currentPlayer.isActive &&
      !currentPlayer.hasBusted
    ) {
      // Check if we're already processing a decision for this player
      // BUT: If there's a pending action card, we MUST resolve it immediately
      // ALSO: If the game state just updated (e.g., from a hit), we should allow
      // a new decision even if aiProcessingRef is set, as the previous decision
      // might have just completed
      const hasPendingActionCard = gameState.pendingActionCard && 
                                   gameState.pendingActionCard.playerId === currentPlayer.id;
      
      // Create a signature of the current game state to detect if it changed
      // This helps us detect when a previous decision completed (game state updated)
      const currentStateSignature = JSON.stringify({
        playerId: currentPlayer.id,
        cardCount: currentPlayer.cards.length,
        roundScore: gameState.roundScores[currentPlayer.id],
        currentPlayerIndex: gameState.currentPlayerIndex,
        pendingActionCard: gameState.pendingActionCard,
        isActive: currentPlayer.isActive,
        hasBusted: currentPlayer.hasBusted
      });
      
      const gameStateChanged = lastProcessedStateRef.current !== currentStateSignature;
      
      // Only skip if we're processing AND there's no pending action card AND game state hasn't changed
      // If game state changed, it means the previous decision completed, so we should process
      // IMPORTANT: Also check if we're processing a DIFFERENT player - if so, clear the ref and proceed
      if (aiProcessingRef.current && aiProcessingRef.current !== currentPlayer.id) {
        // We were processing a different player, but now it's a new player's turn
        // Clear the ref to allow processing the new player
        console.log(`[AI Turn] Switching from player ${aiProcessingRef.current} to ${currentPlayer.id}`);
        aiProcessingRef.current = null;
        lastProcessedStateRef.current = ''; // Reset signature to force processing
      }
      
      if (aiProcessingRef.current === currentPlayer.id && 
          !hasPendingActionCard &&
          !gameStateChanged) {
        return; // Already processing, don't start another (unless there's a pending action card or state changed)
      }
      
      // Update the last processed state signature
      lastProcessedStateRef.current = currentStateSignature;

      // If there's a pending action card, clear the processing ref to allow immediate resolution
      if (hasPendingActionCard) {
        aiProcessingRef.current = null;
      }

      // Set thinking state immediately
      setAiThinkingPlayerId(currentPlayer.id);
      aiProcessingRef.current = currentPlayer.id;
      
      // Clear any existing timers
      if (maxThinkingTimeoutRef.current) {
        clearTimeout(maxThinkingTimeoutRef.current);
      }
      if (aiDecisionTimerRef.current) {
        clearTimeout(aiDecisionTimerRef.current);
      }
      
      // Set maximum timeout to ensure thinking message disappears (2 seconds max)
      maxThinkingTimeoutRef.current = setTimeout(() => {
        setAiThinkingPlayerId(null);
      }, 2000);

      // If there's a pending action card, resolve it immediately (no delay)
      // Otherwise, wait 0.5 seconds for AI to "think"
      const delay = hasPendingActionCard ? 0 : 500;
      
      // Clear any existing max processing timeout
      if (maxProcessingTimeoutRef.current) {
        clearTimeout(maxProcessingTimeoutRef.current);
      }
      
      // Set a maximum timeout to ensure we don't get stuck (3 seconds total)
      maxProcessingTimeoutRef.current = setTimeout(() => {
        console.warn(`AI decision taking too long for ${currentPlayer.id}, clearing processing state`);
        setAiThinkingPlayerId(null);
        aiProcessingRef.current = null;
        maxProcessingTimeoutRef.current = null;
      }, 3000);
      
      aiDecisionTimerRef.current = setTimeout(() => {
        const playerIdAtStart = currentPlayer.id;
        
        // Double-check that this is still the current player before making decision
        // (in case the game state changed during the delay)
        // We'll check this in the finally block instead to avoid accessing store directly
        
        makeAIDecision(playerIdAtStart)
          .catch((error) => {
            // Log error but don't let it hang the game
            console.error(`[AI Decision Error] Error making AI decision for ${playerIdAtStart}:`, error);
            // Force clear processing state so game can continue
            if (aiProcessingRef.current === playerIdAtStart) {
              aiProcessingRef.current = null;
            }
            lastProcessedStateRef.current = ''; // Reset signature to allow retry
          })
          .finally(() => {
            // Clear the max processing timeout
            if (maxProcessingTimeoutRef.current) {
              clearTimeout(maxProcessingTimeoutRef.current);
              maxProcessingTimeoutRef.current = null;
            }
            
            // Clear thinking state when decision is complete
            setAiThinkingPlayerId(null);
            
            // IMPORTANT: Clear aiProcessingRef BEFORE checking game state
            // This ensures the useEffect can trigger again if needed
            // Only clear if we were processing this specific player
            if (aiProcessingRef.current === playerIdAtStart) {
              aiProcessingRef.current = null;
            }
            
            // After clearing the ref, the useEffect should detect the updated game state
            // and trigger another decision if needed. The dependency array includes
            // gameState, currentPlayerIndex, and pendingActionCard, so it should re-run.
            
            if (maxThinkingTimeoutRef.current) {
              clearTimeout(maxThinkingTimeoutRef.current);
              maxThinkingTimeoutRef.current = null;
            }
            if (aiDecisionTimerRef.current) {
              aiDecisionTimerRef.current = null;
            }
          });
      }, delay);

      return () => {
        if (aiDecisionTimerRef.current) {
          clearTimeout(aiDecisionTimerRef.current);
          aiDecisionTimerRef.current = null;
        }
        if (maxThinkingTimeoutRef.current) {
          clearTimeout(maxThinkingTimeoutRef.current);
          maxThinkingTimeoutRef.current = null;
        }
        if (maxProcessingTimeoutRef.current) {
          clearTimeout(maxProcessingTimeoutRef.current);
          maxProcessingTimeoutRef.current = null;
        }
        // Don't clear aiProcessingRef here - let it be cleared in the finally block
        setAiThinkingPlayerId(null);
      };
    } else {
      // Clear thinking state when not an AI turn
      setAiThinkingPlayerId(null);
      aiProcessingRef.current = null;
      if (maxThinkingTimeoutRef.current) {
        clearTimeout(maxThinkingTimeoutRef.current);
        maxThinkingTimeoutRef.current = null;
      }
      if (aiDecisionTimerRef.current) {
        clearTimeout(aiDecisionTimerRef.current);
        aiDecisionTimerRef.current = null;
      }
      if (maxProcessingTimeoutRef.current) {
        clearTimeout(maxProcessingTimeoutRef.current);
        maxProcessingTimeoutRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.currentPlayerIndex, gameState?.gameStatus, currentPlayer?.id, gameState?.pendingActionCard, gameState]);

  // Check for bust and trigger screen shake + sound
  useEffect(() => {
    if (gameState?.players) {
      const anyPlayerBusted = gameState.players.some(p => p.hasBusted);
      const previouslyBusted = previousGameStateRef.current?.players?.some(p => p.hasBusted) || false;

      if (anyPlayerBusted && !previouslyBusted) {
        setScreenShake(true);
        playSound('bust');
        setTimeout(() => setScreenShake(false), 500);
      }
    }
  }, [gameState?.players]);

  // Play win sound when game ends
  useEffect(() => {
    if (gameState?.gameStatus === 'gameEnd' && !winSoundPlayedRef.current) {
      winSoundPlayedRef.current = true;
      playSound('win');
    } else if (gameState?.gameStatus !== 'gameEnd') {
      winSoundPlayedRef.current = false;
    }
  }, [gameState?.gameStatus]);

  // Check for Flip 7 achievement when round ends - ENHANCED
  useEffect(() => {
    // Check if status changed from 'playing' to 'roundEnd'
    const wasPlaying = previousGameStateRef.current?.gameStatus === 'playing';
    const isRoundEnd = gameState?.gameStatus === 'roundEnd';
    
    if (wasPlaying && isRoundEnd && !flip7ShownRef.current && previousGameStateRef.current) {
      // Check previous state (before cards were discarded) for Flip 7
      const flip7Achiever = previousGameStateRef.current.players.find(p => hasFlip7(p));
      
      if (flip7Achiever) {
        setFlip7Player(flip7Achiever.name);
        flip7ShownRef.current = true;
        playSound('flip7');

        // Clear any existing confetti interval
        if (confettiIntervalRef.current) {
          clearInterval(confettiIntervalRef.current);
        }
        
        // ENHANCED CONFETTI - More dramatic and varied
        const duration = 5000; // Longer duration
        const animationEnd = Date.now() + duration;

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }

        // Immediate burst for impact
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });

        // Continuous celebration
        confettiIntervalRef.current = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            if (confettiIntervalRef.current) {
              clearInterval(confettiIntervalRef.current);
              confettiIntervalRef.current = null;
            }
            return;
          }

          const particleCount = 50 * (timeLeft / duration);
          
          // Multi-directional confetti
          confetti({
            particleCount,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#00FF00', '#0080FF']
          });
          confetti({
            particleCount,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#00FF00', '#0080FF']
          });
          
          // Falling from top
          confetti({
            particleCount: particleCount / 2,
            startVelocity: 45,
            spread: 360,
            ticks: 100,
            origin: { x: randomInRange(0.1, 0.9), y: 0 },
            colors: ['#FFD700', '#FFA500', '#FF6347']
          });
        }, 250);
      }
    } else if (gameState && gameState.gameStatus !== 'roundEnd') {
      // Reset when round starts again
      flip7ShownRef.current = false;
      setFlip7Player(null);
      if (confettiIntervalRef.current) {
        clearInterval(confettiIntervalRef.current);
        confettiIntervalRef.current = null;
      }
    }
    
    // Update previous state ref - deep copy players to preserve their cards
    if (gameState && gameState.gameStatus === 'playing') {
      previousGameStateRef.current = {
        ...gameState,
        players: gameState.players.map(p => ({
          ...p,
          cards: [...p.cards],
          numberCards: [...p.numberCards],
          modifierCards: [...p.modifierCards],
          actionCards: [...p.actionCards],
        })),
      };
    }

    // Cleanup on unmount
    return () => {
      if (confettiIntervalRef.current) {
        clearInterval(confettiIntervalRef.current);
        confettiIntervalRef.current = null;
      }
    };
  }, [gameState?.gameStatus, gameState]);

  if (!gameState) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center rounded-lg shadow-lg border-4 bg-gray-800 border-gray-600 text-white animate-scale-in">
        <h2 className="text-2xl font-bold mb-4 text-white flex items-center justify-center gap-2">
          {loading && <span className="animate-spin text-3xl">⟳</span>}
          <span>Loading Game...</span>
        </h2>
        <div className="mb-4 text-gray-300">
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded shimmer w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-700 rounded shimmer w-1/2 mx-auto"></div>
            </div>
          ) : (
            'No game state available'
          )}
        </div>
        {error && (
          <div className="border-2 px-4 py-3 rounded mb-4 bg-red-900 border-red-600 text-red-100 animate-shake">
            {error}
          </div>
        )}
      </div>
    );
  }

  // If game is waiting, show start round button
  if (gameState.gameStatus === 'waiting') {
    return (
      <div className="max-w-4xl mx-auto p-6 animate-scale-in">
        <div className="border-4 rounded-lg p-6 text-center bg-blue-900 border-blue-600 shadow-2xl">
          <h2 className="text-2xl font-bold mb-4 text-blue-100 animate-float">🎮 Ready to Start!</h2>
          <p className="mb-4 text-blue-200 text-lg">Round {gameState.round}</p>
          <button
            onClick={startRound}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin">⟳</span>
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Start Round</span>
                </>
              )}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>
        </div>
      </div>
    );
  }

  if (gameState.gameStatus === 'gameEnd') {
    if (!gameState.players || gameState.players.length === 0) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="border-4 rounded-lg p-6 text-center bg-red-900 border-red-600">
            <h2 className="text-2xl font-bold mb-4 text-red-100">Error</h2>
            <p className="text-red-200">No players found in game state.</p>
          </div>
        </div>
      );
    }

    const winner = gameState.players.reduce((prev, current) =>
      current.score > prev.score ? current : prev
    );

    return (
      <div className="max-w-6xl mx-auto flex-1 flex flex-col p-0.5 sm:p-1 md:p-2 min-h-0">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Game Over Header */}
          <div className="border-2 sm:border-4 rounded-lg p-1.5 sm:p-2 md:p-3 text-center mb-1 sm:mb-2 flex-shrink-0 bg-green-900 border-green-600">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 text-green-100">Game Over!</h2>
            <p className="text-sm sm:text-base md:text-lg mb-1 sm:mb-2 text-green-200">
              <span className="font-bold">{winner.name}</span> wins with {winner.score} points!
            </p>
            <ScoreDisplay />
          </div>
          
          {/* Scrollable Stats */}
          <div className="flex-1 overflow-y-auto min-h-0 px-0.5 sm:px-1 pb-safe">
            <GameStats />
          </div>
          
          {/* Game Over Buttons - Fixed at bottom */}
          {(onNewGame || onRematch) && (
            <div className="flex-shrink-0 pt-1 sm:pt-2 pb-safe mt-1 sm:mt-2 border-t-2 border-gray-600 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent">
              <div className="flex gap-2 sm:gap-3 justify-center pb-1 sm:pb-2">
                {onRematch && (
                  <button
                    onClick={onRematch}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg font-bold text-sm sm:text-base hover:bg-green-700 hover:scale-105 active:bg-green-800 active:scale-95 transition-all duration-200 min-w-[120px] sm:min-w-[160px] relative overflow-hidden group"
                    style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <span>🔁</span>
                      <span>Rematch</span>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  </button>
                )}
                {onNewGame && (
                  <button
                    onClick={onNewGame}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white rounded-lg font-bold text-sm sm:text-base hover:bg-blue-600 hover:scale-105 active:bg-blue-700 active:scale-95 transition-all duration-200 min-w-[120px] sm:min-w-[160px] relative overflow-hidden group"
                    style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <span>🏠</span>
                      <span>New Game</span>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Note: We no longer return early for roundEnd - we show the game board with all players

  const aiPlayers = gameState.players?.filter(p => p.isAI) || [];
  const humanPlayers = gameState.players?.filter(p => !p.isAI) || [];

  return (
    <div className={`max-w-6xl mx-auto flex flex-col p-0.5 sm:p-1 md:p-2 relative no-select h-full ${screenShake ? 'screen-shake' : ''}`}>
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-1 left-1 sm:top-2 sm:left-2 z-10 p-2 rounded-lg bg-gray-800/80 hover:bg-gray-700 border-2 border-gray-600 text-white transition-colors"
          aria-label="Back to main menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      {/* Scaled content wrapper - mobile uses zoom for better fit */}
      <div className="flex-1 flex flex-col min-h-0 game-content-scale overflow-hidden">
        {/* Compact header with scores and game state indicators */}
        <div className={`mb-0.5 sm:mb-1 rounded-lg shadow-lg p-1 border sm:border-2 flex-shrink-0 ${themeConfig.cardBg} ${themeConfig.cardBorder}`}>
          <div className="flex justify-between items-center gap-1 mb-0.5">
            <h1 className={`text-sm sm:text-lg md:text-xl font-bold ${themeConfig.textPrimary} ${onBack ? 'ml-10 sm:ml-12' : ''}`}>Flip 7</h1>
            <div className={`text-[9px] sm:text-[10px] ${themeConfig.textSecondary} flex items-center gap-1`}>
              <span className="font-semibold">R{gameState.round || 1}</span>
              <span>•</span>
              <span className="flex items-center gap-0.5">
                <span className="text-sm">🎴</span>
                <span>{gameState.players?.[gameState.dealerIndex]?.name || '?'}</span>
              </span>
            </div>
          </div>
          <ScoreDisplay />
          
          {/* Last action indicator */}
          {lastAction && (
            <div className="mt-1 text-[9px] sm:text-xs text-center bg-blue-900/50 border border-blue-600 rounded px-2 py-0.5 text-blue-200 animate-scale-in">
              {lastAction}
            </div>
          )}
        </div>

        {error && (
          <div className="border-2 px-4 py-2 rounded mb-2 text-sm flex-shrink-0 bg-red-900 border-red-600 text-red-100">
            {error}
          </div>
        )}

        {/* Flip 7 Announcement - Overlay - ENHANCED */}
        {flip7Player && isRoundEnd && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 border-4 px-6 py-4 rounded-xl text-center shadow-2xl bg-gradient-to-r from-yellow-900 via-yellow-700 to-yellow-900 border-yellow-400 text-yellow-100 animate-bounce-soft">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-yellow-300/30 to-transparent animate-shimmer"></div>
            <h2 className="text-3xl font-bold mb-2 text-yellow-100 relative animate-float">
              🎉 FLIP 7 ACHIEVED! 🎉
            </h2>
            <p className="text-xl font-semibold text-yellow-200 relative">
              {flip7Player} got the Flip 7!
            </p>
            <div className="mt-2 text-2xl relative animate-pulse">
              ⭐ +15 Points ⭐
            </div>
          </div>
        )}

        {/* Round End Header - Overlay */}
        {isRoundEnd && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40 border-4 px-4 py-3 rounded-lg text-center bg-blue-900 border-blue-600 text-blue-100">
            <h2 className="text-xl font-bold text-blue-100">
              Round {gameState.round} Complete!
            </h2>
          </div>
        )}

        {!gameState.players || gameState.players.length === 0 ? (
          <div className="rounded-lg shadow-lg p-6 text-center border-4 flex-1 flex items-center justify-center bg-gray-800 border-gray-600 text-white">
            <div>
              <h3 className="text-xl font-bold mb-2 text-white">No Players</h3>
              <p className="text-gray-400">No players in game. Please start a new game.</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Scrollable content area - AI players and human player */}
            <div className="flex-1 overflow-y-auto min-h-0 mb-1 sm:mb-2 scrollbar-thin overflow-x-hidden" style={{ 
              paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom, 0px))',
              WebkitOverflowScrolling: 'touch'
            }}>
            {/* AI/Other Players Area */}
            {aiPlayers.length > 0 && (
              <div className="flex-shrink-0 mb-1 sm:mb-2">
                <div className="flex gap-1 sm:gap-2">
                  {aiPlayers.map((player) => {
                    const originalIndex = gameState.players?.findIndex(p => p.id === player.id) ?? -1;
                    const isThinking = aiThinkingPlayerId === player.id &&
                      originalIndex === gameState.currentPlayerIndex &&
                      player.isAI &&
                      player.isActive &&
                      !player.hasBusted;
                    const widthClass = aiPlayers.length === 3 ? 'flex-1' : aiPlayers.length === 2 ? 'flex-1' : 'flex-shrink-0 min-w-[200px]';
                    return (
                      <div key={player.id || `player-${originalIndex}`} className={`flex flex-col ${widthClass}`}>
                        <PlayerArea
                          player={player}
                          isCurrentPlayer={!isRoundEnd && originalIndex === gameState.currentPlayerIndex}
                          isDealer={originalIndex === gameState.dealerIndex}
                          isCompact={true}
                        />
                        {/* Reserve space for thinking message to prevent jumping */}
                        <div className={`mt-0.5 text-center text-[10px] sm:text-xs italic h-3 sm:h-4 ${
                          isThinking ? 'text-gray-400' : 'text-transparent'
                        }`}>
                          {isThinking ? `${player.name} thinking...` : '\u00A0'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Human Player Area(s) */}
            {humanPlayers.length > 0 && (
              <div className="flex-shrink-0 border-t-2 sm:border-t-4 pt-1 sm:pt-2 mt-1 sm:mt-2">
                {humanPlayers.length > 1 ? (
                  // Multiple human players (Local mode) - show in a row like AI players
                  <div className="flex gap-1 sm:gap-2">
                    {humanPlayers.map((player) => {
                      const originalIndex = gameState.players?.findIndex(p => p.id === player.id) ?? -1;
                      const widthClass = humanPlayers.length === 3 ? 'flex-1' : humanPlayers.length === 2 ? 'flex-1' : 'flex-shrink-0 min-w-[200px]';
                      return (
                        <div key={player.id || `player-${originalIndex}`} className={`flex flex-col ${widthClass}`}>
                          <PlayerArea
                            player={player}
                            isCurrentPlayer={!isRoundEnd && originalIndex === gameState.currentPlayerIndex}
                            isDealer={originalIndex === gameState.dealerIndex}
                            isCompact={true}
                          />
                          <div className="mt-1 text-center text-xs italic h-4 text-transparent">
                            {'\u00A0'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Single human player - show full size
                  <>
                    <PlayerArea
                      player={humanPlayers[0]}
                      isCurrentPlayer={!isRoundEnd && gameState.players?.findIndex(p => p.id === humanPlayers[0].id) === gameState.currentPlayerIndex}
                      isDealer={gameState.players?.findIndex(p => p.id === humanPlayers[0].id) === gameState.dealerIndex}
                      isCompact={false}
                    />
                    <div className="mt-1 text-center text-xs italic h-4 text-transparent">
                      {'\u00A0'}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          </div>
        )}
      </div>

      {/* Action Buttons - Fixed at bottom, always visible (outside scale) */}
      {(localPlayer || humanPlayer || currentHumanPlayer) && (
        <div 
          data-action-buttons
          className="flex-shrink-0 pt-1 sm:pt-2 border-t-2 border-gray-600 space-y-0.5 sm:space-y-1 md:space-y-2 mt-auto flex flex-col justify-center bg-gradient-to-t from-gray-900 via-gray-900 to-transparent min-h-[60px] sm:min-h-[80px] md:min-h-[100px]" 
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0.5rem))' }}
        >
          {false && onNewGame ? (
            <div className="flex gap-2 sm:gap-3 justify-center">
              <button
                onClick={onNewGame}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-500 text-white rounded-lg font-bold text-sm sm:text-base hover:bg-blue-600 active:bg-blue-700 transition-colors min-w-[120px] sm:min-w-[160px]"
              >
                New Game
              </button>
            </div>
          ) : isRoundEnd ? (
            <div className="flex gap-2 sm:gap-3 justify-center">
              <button
                onClick={startNextRound}
                disabled={loading}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-500 text-white rounded-lg font-bold text-sm sm:text-base hover:bg-blue-600 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/50 active:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 min-w-[120px] sm:min-w-[160px] relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <span>▶️</span>
                      <span>Next Round</span>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </button>
            </div>
          ) : currentHumanPlayer &&
            currentHumanPlayer.isActive &&
            !currentHumanPlayer.hasBusted ? (
            <div className="flex flex-col gap-0.5 sm:gap-1 md:gap-2">
              <div className="flex items-start gap-1 sm:gap-2 md:gap-4 justify-center flex-wrap">
                <ActionButtons playerId={currentHumanPlayer.id} />
                <ActionCardButtons playerId={currentHumanPlayer.id} actionCards={currentHumanPlayer.actionCards} />
              </div>
            </div>
          ) : isMultiplayer && currentPlayer && !isLocalPlayerTurn && gameState?.gameStatus === 'playing' ? (
            // Show waiting message in multiplayer when it's not our turn
            <div className="flex flex-col gap-0.5 sm:gap-1 md:gap-2">
              <div className="flex items-center justify-center text-gray-400 text-sm sm:text-base md:text-lg py-2">
                <span className="animate-pulse">⏳</span>
                <span className="ml-2">Waiting for {currentPlayer.name}...</span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Troubleshooting/Debug info at bottom - small, non-intrusive */}
      {(loading || error) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
          <div className={`text-xs px-2 py-1 text-center ${
            error
              ? 'bg-red-900/90 text-red-200'
              : 'bg-blue-900/90 text-blue-200'
          }`}>
            {error ? `Error: ${error}` : loading ? 'Loading...' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

