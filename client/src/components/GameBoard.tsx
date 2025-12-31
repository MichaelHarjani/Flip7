import { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../stores/gameStore';
import { useWebSocketStore } from '../stores/websocketStore';
import { useRoomStore } from '../stores/roomStore';
import PlayerArea from './PlayerArea';
import ActionButtons from './ActionButtons';
import ActionCardButtons from './ActionCardButtons';
import ScoreDisplay from './ScoreDisplay';
import GameStats from './GameStats';
import confetti from 'canvas-confetti';
import { hasFlip7 } from '../utils/gameLogic';

interface GameBoardProps {
  onNewGame?: () => void;
}

export default function GameBoard({ onNewGame }: GameBoardProps) {
  const { gameState, makeAIDecision, startNextRound, startRound, loading, error, setGameState } = useGameStore();
  const { roomCode } = useRoomStore();
  const [aiThinkingPlayerId, setAiThinkingPlayerId] = useState<string | null>(null);
  const maxThinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiDecisionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const aiProcessingRef = useRef<string | null>(null);
  const maxProcessingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [flip7Player, setFlip7Player] = useState<string | null>(null);
  const flip7ShownRef = useRef(false);
  const previousGameStateRef = useRef<typeof gameState>(null);
  const confettiIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedStateRef = useRef<string>(''); // Track last processed game state to detect changes

  // Calculate current player before any early returns (for useEffect)
  const currentPlayer = gameState?.players?.[gameState.currentPlayerIndex];
  const humanPlayer = gameState?.players?.find(p => !p.isAI);
  const currentHumanPlayer = currentPlayer && !currentPlayer.isAI ? currentPlayer : null;
  const isRoundEnd = gameState?.gameStatus === 'roundEnd';

  // Listen for WebSocket game state updates in multiplayer mode
  useEffect(() => {
    if (roomCode) {
      const wsStore = useWebSocketStore.getState();
      const handleGameState = (data: { gameState: any }) => {
        setGameState(data.gameState);
      };
      
      wsStore.on('game:state', handleGameState);
      
      return () => {
        wsStore.off('game:state', handleGameState);
      };
    }
  }, [roomCode, setGameState]);

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

  // Check for Flip 7 achievement when round ends
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
        
        // Clear any existing confetti interval
        if (confettiIntervalRef.current) {
          clearInterval(confettiIntervalRef.current);
        }
        
        // Trigger confetti
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }

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
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          });
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
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
      <div className="max-w-4xl mx-auto p-6 text-center rounded-lg shadow-lg border-4 bg-gray-800 border-gray-600 text-white">
        <h2 className="text-2xl font-bold mb-4 text-white">Loading Game...</h2>
        <div className="mb-4 text-gray-300">
          {loading ? 'Please wait...' : 'No game state available'}
        </div>
        {error && (
          <div className="border-2 px-4 py-3 rounded mb-4 bg-red-900 border-red-600 text-red-100">
            {error}
          </div>
        )}
      </div>
    );
  }

  // If game is waiting, show start round button
  if (gameState.gameStatus === 'waiting') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="border-4 rounded-lg p-6 text-center bg-blue-900 border-blue-600">
          <h2 className="text-2xl font-bold mb-4 text-blue-100">Ready to Start!</h2>
          <p className="mb-4 text-blue-200">Round {gameState.round}</p>
          <button
            onClick={startRound}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {loading ? 'Starting...' : 'Start Round'}
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
      <div className="max-w-6xl mx-auto flex-1 flex flex-col p-1 md:p-2 min-h-0">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Game Over Header */}
          <div className="border-4 rounded-lg p-3 text-center mb-2 flex-shrink-0 bg-green-900 border-green-600">
            <h2 className="text-2xl font-bold mb-2 text-green-100">Game Over!</h2>
            <p className="text-lg mb-2 text-green-200">
              <span className="font-bold">{winner.name}</span> wins with {winner.score} points!
            </p>
            <ScoreDisplay />
          </div>
          
          {/* Scrollable Stats */}
          <div className="flex-1 overflow-y-auto min-h-0 px-1">
            <GameStats />
          </div>
          
          {/* New Game Button */}
          {onNewGame && (
            <div className="flex-shrink-0 pt-2 pb-2 mt-2 border-t-2 border-gray-600">
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onNewGame}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold text-base hover:bg-blue-600 transition-colors"
                  style={{ minWidth: '13rem' }}
                >
                  New Game
                </button>
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
    <div className="max-w-6xl mx-auto flex-1 flex flex-col p-1 md:p-2 min-h-0 relative">
      {/* Scaled content wrapper - scales everything except buttons */}
      <div className="flex-1 flex flex-col min-h-0" style={{ zoom: 0.8 }}>
        {/* Compact header with scores */}
        <div className="mb-1 rounded-lg shadow-lg p-1 border-2 flex-shrink-0 bg-gray-800 border-gray-600">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-0.5 mb-0.5">
            <h1 className="text-lg md:text-xl font-bold text-white">Flip 7</h1>
            <div className="text-[10px] text-gray-300">
              Round {gameState.round || 1} | Dealer: {gameState.players?.[gameState.dealerIndex]?.name || 'Unknown'}
            </div>
          </div>
          <ScoreDisplay />
        </div>

        {error && (
          <div className="border-2 px-4 py-2 rounded mb-2 text-sm flex-shrink-0 bg-red-900 border-red-600 text-red-100">
            {error}
          </div>
        )}

        {/* Flip 7 Announcement - Overlay */}
        {flip7Player && isRoundEnd && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 border-4 px-6 py-4 rounded-lg text-center shadow-xl bg-gradient-to-r from-yellow-900 via-yellow-800 to-yellow-900 border-yellow-500 text-yellow-100">
            <h2 className="text-3xl font-bold mb-2 text-yellow-100">
              🎉 FLIP 7 ACHIEVED! 🎉
            </h2>
            <p className="text-xl font-semibold text-yellow-200">
              {flip7Player} got the Flip 7!
            </p>
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
            <div className="flex-1 overflow-y-auto min-h-0 mb-2">
            {/* AI/Other Players Area */}
            {aiPlayers.length > 0 && (
              <div className="flex-shrink-0 mb-2">
                <div className="flex gap-2">
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
                        <div className={`mt-1 text-center text-xs italic h-4 ${
                          isThinking ? 'text-gray-400' : 'text-transparent'
                        }`}>
                          {isThinking ? `${player.name} is thinking...` : '\u00A0'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Human Player Area(s) */}
            {humanPlayers.length > 0 && (
              <div className="flex-shrink-0 border-t-4 pt-2 mt-2">
                {humanPlayers.length > 1 ? (
                  // Multiple human players (Local mode) - show in a row like AI players
                  <div className="flex gap-2">
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
      {(humanPlayer || currentHumanPlayer) && (
        <div className="flex-shrink-0 pt-2 border-t-2 space-y-2 pb-2 mt-auto min-h-[140px] flex flex-col">
          {false && onNewGame ? (
            <div className="flex gap-3 justify-center">
              <button
                onClick={onNewGame}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold text-base hover:bg-blue-600 transition-colors"
                style={{ minWidth: '13rem' }}
              >
                New Game
              </button>
            </div>
          ) : isRoundEnd ? (
            <div className="flex gap-3 justify-center">
              <button
                onClick={startNextRound}
                disabled={loading}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg font-bold text-base hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ minWidth: '13rem' }}
              >
                Next Round
              </button>
            </div>
          ) : currentHumanPlayer &&
            currentHumanPlayer.isActive &&
            !currentHumanPlayer.hasBusted ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-4 justify-center flex-wrap">
                <ActionButtons playerId={currentHumanPlayer.id} />
                <ActionCardButtons playerId={currentHumanPlayer.id} actionCards={currentHumanPlayer.actionCards} />
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

