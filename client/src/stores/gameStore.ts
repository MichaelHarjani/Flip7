import { create } from 'zustand';
import type { GameState, Player } from '@shared/types/index';
import { getActivePlayers, calculateScore } from '../utils/gameLogic';
import { useWebSocketStore } from './websocketStore';
import { useRoomStore } from './roomStore';
import logger from '../utils/logger';
// Game state management for single and multiplayer modes

interface GameStore {
  gameId: string | null;
  gameState: GameState | null;
  loading: boolean;
  error: string | null;

  // Actions
  startGame: (playerNames: string[], aiDifficulties: Array<'conservative' | 'moderate' | 'aggressive'>) => Promise<void>;
  restartGame: () => Promise<void>;
  startRound: () => Promise<void>;
  hit: (playerId: string) => Promise<void>;
  stay: (playerId: string) => Promise<void>;
  playActionCard: (playerId: string, cardId: string, targetPlayerId?: string) => Promise<void>;
  startNextRound: () => Promise<void>;
  makeAIDecision: (playerId: string) => Promise<void>;
  setGameState: (gameState: GameState) => void;
  clearError: () => void;
  reset: () => void;
}

// Use environment variable for API base URL, fallback to relative path
// Single player and local games always use Vercel serverless functions (/api/game)
// VITE_WS_URL is only for WebSocket connections in multiplayer mode, not for REST API calls
const getApiBase = () => {
  // If explicitly set, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Always use relative path for Vercel serverless functions
  // This works for both development (via proxy) and production (via Vercel)
  return '/api/game';
};

const API_BASE = getApiBase();

/**
 * Select a target for an action card (Freeze or Flip Three)
 * This replicates the server-side logic to ensure consistency
 */
function selectActionCardTarget(
  player: Player,
  gameState: GameState,
  actionType: 'freeze' | 'flipThree'
): string | undefined {
  const activePlayers = getActivePlayers(gameState.players);
  const otherActivePlayers = activePlayers.filter(p => p.id !== player.id);
  
  if (otherActivePlayers.length === 0) {
    // No other active players - target self
    return player.id;
  }
  
  if (actionType === 'freeze') {
    // For Freeze: Target the player with the highest round score (most threatening)
    // If tied, target the one closest to Flip 7
    let bestTarget = otherActivePlayers[0];
    let bestScore = gameState.roundScores[bestTarget.id] || calculateScore(bestTarget);
    let bestFlip7Progress = new Set(
      bestTarget.numberCards
        .filter(c => c.type === 'number' && c.value !== undefined)
        .map(c => c.value)
    ).size;
    
    for (const opponent of otherActivePlayers) {
      const opponentScore = gameState.roundScores[opponent.id] || calculateScore(opponent);
      const opponentFlip7Progress = new Set(
        opponent.numberCards
          .filter(c => c.type === 'number' && c.value !== undefined)
          .map(c => c.value)
      ).size;
      
      // Prefer higher score, or if tied, prefer closer to Flip 7
      if (opponentScore > bestScore || 
          (opponentScore === bestScore && opponentFlip7Progress > bestFlip7Progress)) {
        bestTarget = opponent;
        bestScore = opponentScore;
        bestFlip7Progress = opponentFlip7Progress;
      }
    }
    
    return bestTarget.id;
  } else if (actionType === 'flipThree') {
    // For Flip Three: Always target self to prevent game freezing
    return player.id;
  }
  
  // Fallback: target first other player
  return otherActivePlayers[0].id;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameId: null,
  gameState: null,
  loading: false,
  error: null,

  startGame: async (playerNames, aiDifficulties) => {
    set({ loading: true, error: null });
    try {
      const url = `${API_BASE}/start`;
      logger.log('Starting game, API_BASE:', API_BASE, 'URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerNames, aiDifficulties }),
      });
      
      logger.log('Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to start game' }));
        logger.error('Start game error response:', JSON.stringify(errorData, null, 2));
        logger.error('Response status:', response.status, response.statusText);
        throw new Error(errorData.details || errorData.error || `Failed to start game (${response.status})`);
      }
      
      const data = await response.json();
      logger.log('Game started successfully:', data.gameId);
      set({
        gameId: data.gameId,
        gameState: data.gameState,
        loading: false
      });
    } catch (error: any) {
      logger.error('Start game exception:', error);
      const errorMessage = error.message || 'Failed to start game. Please check your connection.';
      set({ error: errorMessage, loading: false });
    }
  },

  restartGame: async () => {
    const { gameState } = get();
    if (!gameState || !gameState.players) {
      set({ error: 'No game to restart', loading: false });
      return;
    }

    // Extract player names and AI difficulties from current game state
    // Keep all player names in order, but only include difficulties for AI players
    const playerNames = gameState.players.map(p => p.name);
    const aiDifficulties = gameState.players
      .filter(p => p.isAI)
      .map(p => p.aiDifficulty || 'moderate') as Array<'conservative' | 'moderate' | 'aggressive'>;

    // Reset and start a new game with the same configuration
    set({ gameId: null, gameState: null, loading: true, error: null });

    try {
      const url = `${API_BASE}/start`;
      logger.log('Restarting game with same players:', playerNames);
      logger.log('AI difficulties:', aiDifficulties, `(${aiDifficulties.length} AI players)`);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerNames, aiDifficulties }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to restart game' }));
        throw new Error(errorData.details || errorData.error || `Failed to restart game (${response.status})`);
      }

      const data = await response.json();
      logger.log('Game restarted successfully:', data.gameId);
      set({
        gameId: data.gameId,
        gameState: data.gameState,
        loading: false
      });
    } catch (error: any) {
      logger.error('Restart game exception:', error);
      const errorMessage = error.message || 'Failed to restart game. Please check your connection.';
      set({ error: errorMessage, loading: false });
    }
  },

  startRound: async () => {
    const { gameId, gameState: currentState } = get();
    if (!gameId) {
      set({ error: 'No game ID found. Please start a new game.', loading: false });
      return;
    }
    
    if (!currentState) {
      set({ error: 'No game state found. Please start a new game.', loading: false });
      return;
    }
    
    set({ loading: true, error: null });
    try {
      logger.log('Starting round for game:', gameId);
      const response = await fetch(`${API_BASE}/${gameId}/round/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameState: currentState }),
      });
      
      logger.log('Round start response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to start round' }));
        logger.error('Round start error:', errorData);
        throw new Error(errorData.error || 'Failed to start round');
      }
      
      const data = await response.json();
      logger.log('Round start data:', data);
      
      if (!data.gameState) {
        logger.error('No gameState in response:', data);
        throw new Error('Invalid response from server');
      }
      
      set({ gameState: data.gameState, loading: false });
    } catch (error: any) {
      logger.error('Error starting round:', error);
      // Preserve current gameState if it exists, so we don't lose the game
      set({ 
        error: error.message || 'Failed to start round', 
        loading: false,
        gameState: currentState || null
      });
    }
  },

  hit: async (playerId: string) => {
    const { gameId, gameState: currentState } = get();
    const roomStore = useRoomStore.getState();
    const wsStore = useWebSocketStore.getState();
    
    // Check if we're in multiplayer mode
    if (roomStore.roomCode && wsStore.socket && wsStore.connected) {
      set({ loading: true, error: null });
      try {
        wsStore.emit('game:hit', { playerId });
        // Game state will be updated via WebSocket listener
      } catch (error: any) {
        set({ loading: false, error: error.message });
      }
      return;
    }
    
    // Fallback to REST API for single/local mode
    if (!gameId || !currentState) return;
    
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/${gameId}/hit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, gameState: currentState }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to hit');
      }
      
      const data = await response.json();
      set({ gameState: data.gameState, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  stay: async (playerId: string) => {
    const { gameId, gameState: currentState } = get();
    const roomStore = useRoomStore.getState();
    const wsStore = useWebSocketStore.getState();
    
    // Check if we're in multiplayer mode
    if (roomStore.roomCode && wsStore.socket && wsStore.connected) {
      set({ loading: true, error: null });
      try {
        wsStore.emit('game:stay', { playerId });
        // Game state will be updated via WebSocket listener
      } catch (error: any) {
        set({ loading: false, error: error.message });
      }
      return;
    }
    
    // Fallback to REST API for single/local mode
    if (!gameId || !currentState) return;
    
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/${gameId}/stay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, gameState: currentState }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stay');
      }
      
      const data = await response.json();
      set({ gameState: data.gameState, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  playActionCard: async (playerId: string, cardId: string, targetPlayerId?: string) => {
    const { gameId, gameState: currentState } = get();
    const roomStore = useRoomStore.getState();
    const wsStore = useWebSocketStore.getState();
    
    // Check if we're in multiplayer mode
    if (roomStore.roomCode && wsStore.socket && wsStore.connected) {
      set({ loading: true, error: null });
      try {
        wsStore.emit('game:playActionCard', { playerId, cardId, targetPlayerId });
        // Game state will be updated via WebSocket listener
      } catch (error: any) {
        set({ loading: false, error: error.message });
      }
      return;
    }
    
    // Fallback to REST API for single/local mode
    if (!gameId || !currentState) return;
    
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/${gameId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, cardId, targetPlayerId, gameState: currentState }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to play action card');
      }
      
      const data = await response.json();
      set({ gameState: data.gameState, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  startNextRound: async () => {
    const { gameId, gameState: currentState } = get();
    const roomStore = useRoomStore.getState();
    const wsStore = useWebSocketStore.getState();
    
    // Check if we're in multiplayer mode
    if (roomStore.roomCode && wsStore.socket && wsStore.connected) {
      set({ loading: true, error: null });
      try {
        wsStore.emit('game:nextRound');
        // Game state will be updated via WebSocket listener
      } catch (error: any) {
        set({ loading: false, error: error.message });
      }
      return;
    }
    
    // Fallback to REST API for single/local mode
    if (!gameId || !currentState) return;
    
    set({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/${gameId}/round-next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameState: currentState }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start next round');
      }
      
      const data = await response.json();
      set({ gameState: data.gameState, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  makeAIDecision: async (playerId: string) => {
    const { gameId, gameState } = get();
    if (!gameId || !gameState) return;
    
    // Track the player state at the start
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || !player.isActive || player.hasBusted) {
      return;
    }
    
    // Set up timeout to default to "Hit" after 0.5 seconds if decision takes too long
    let timeoutId: NodeJS.Timeout | null = null;
    let decisionResolved = false;
    
    const timeoutPromise = new Promise<void>((resolve) => {
      timeoutId = setTimeout(() => {
        if (!decisionResolved) {
          decisionResolved = true;
          // Default action if player is still active and hasn't busted
          const currentState = get().gameState;
          if (!currentState) {
            resolve();
            return;
          }
          
          const currentPlayer = currentState.players.find(p => p.id === playerId);
          if (currentPlayer && currentPlayer.isActive && !currentPlayer.hasBusted) {
            // Check if there's a pending action card that needs to be resolved
            const pendingActionCard = currentState.pendingActionCard;
            if (pendingActionCard && pendingActionCard.playerId === playerId) {
              // Find the card in the player's hand
              const card = currentPlayer.actionCards.find(c => c.id === pendingActionCard.cardId);
              if (card) {
                logger.warn(`AI decision timeout for ${playerId}, resolving pending action card`);
                // Use proper target selection logic to prevent freezing
                const targetId = selectActionCardTarget(currentPlayer, currentState, pendingActionCard.actionType);
                get().playActionCard(playerId, pendingActionCard.cardId, targetId)
                  .then(() => resolve())
                  .catch((error) => {
                    logger.error(`Error resolving pending action card in timeout:`, error);
                    resolve(); // Resolve anyway to prevent hanging
                  });
              } else {
                // Card not found, default to Hit
                logger.warn(`AI decision timeout for ${playerId}, card not found, defaulting to Hit`);
                get().hit(playerId).then(() => resolve()).catch((error) => {
                  logger.error(`Error hitting in timeout:`, error);
                  resolve(); // Resolve anyway to prevent hanging
                });
              }
            } else {
              // No pending action card, default to Hit
              logger.warn(`AI decision timeout for ${playerId}, defaulting to Hit`);
              get().hit(playerId).then(() => resolve()).catch((error) => {
                logger.error(`Error hitting in timeout:`, error);
                resolve(); // Resolve anyway to prevent hanging
              });
            }
          } else {
            resolve();
          }
        }
      }, 500); // 0.5 seconds
    });
    
    try {
      const decisionPromise = (async () => {
        const response = await fetch(`${API_BASE}/${gameId}/ai/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, gameState }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to get AI decision');
        }
        
        const data = await response.json();
        const decision = data.decision;
        
        if (decisionResolved) {
          // Timeout already fired, don't process this decision
          return;
        }
        
        decisionResolved = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // If AI has a pending action card to play, play it FIRST
        // This is critical for action cards that must be resolved immediately (like Freeze)
        // The action card resolution will handle turn progression
        if (decision.actionCard) {
          await get().playActionCard(
            playerId,
            decision.actionCard.cardId,
            decision.actionCard.targetPlayerId
          );
          
          // After playing the action card, check if a new pending action card was created
          // (e.g., Flip Three drew a Freeze card). The useEffect will handle triggering
          // the next decision, but we need to ensure the processing ref is cleared so it can.
          // Note: The useEffect in GameBoard will detect the new pending card and trigger
          // another AI decision automatically.
          
          // Don't execute hit/stay after playing a pending action card
          // The action card resolution already handles turn progression
          return;
        }
        
        // No action card - proceed with normal hit/stay
        if (decision.action === 'hit') {
          await get().hit(playerId);
          
          // After hitting, check if a pending action card was created
          // (e.g., the drawn card was a Freeze or Flip Three)
          // The useEffect in GameBoard will detect this and trigger another decision
          const updatedState = get().gameState;
          if (updatedState?.pendingActionCard?.playerId === playerId) {
            // There's a new pending action card - the useEffect will handle it
            // We just need to ensure the processing ref is cleared so it can trigger
            // (This is already handled by the finally block, but we return early
            // to prevent any further processing)
            return;
          }
        } else if (decision.action === 'stay') {
          await get().stay(playerId);
        }
      })();
      
      // Race between the decision and the timeout
      await Promise.race([decisionPromise, timeoutPromise]);
    } catch (error: any) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // If we get an error and haven't resolved yet, try to handle pending action card or default to Hit
      if (!decisionResolved) {
        decisionResolved = true;
        const currentState = get().gameState;
        if (!currentState) {
          set({ error: error.message });
          return;
        }
        
        const currentPlayer = currentState.players.find(p => p.id === playerId);
        if (currentPlayer && currentPlayer.isActive && !currentPlayer.hasBusted) {
          // Check if there's a pending action card that needs to be resolved
          const pendingActionCard = currentState.pendingActionCard;
          if (pendingActionCard && pendingActionCard.playerId === playerId) {
            const card = currentPlayer.actionCards.find(c => c.id === pendingActionCard.cardId);
            if (card) {
              logger.warn(`AI decision error for ${playerId}, attempting to resolve pending action card`);
              try {
                const targetId = selectActionCardTarget(currentPlayer, currentState, pendingActionCard.actionType);
                await get().playActionCard(playerId, pendingActionCard.cardId, targetId);
              } catch (actionError) {
                logger.error(`Error resolving pending action card in error handler:`, actionError);
                // Fallback to Hit if action card resolution fails
                try {
                  await get().hit(playerId);
                } catch (hitError) {
                  set({ error: error.message });
                }
              }
            } else {
              // Card not found, default to Hit
              logger.warn(`AI decision error for ${playerId}, card not found, defaulting to Hit`);
              try {
                await get().hit(playerId);
              } catch (hitError) {
                set({ error: error.message });
              }
            }
          } else {
            // No pending action card, default to Hit
            logger.warn(`AI decision error for ${playerId}, defaulting to Hit`);
            try {
              await get().hit(playerId);
            } catch (hitError) {
              set({ error: error.message });
            }
          }
        } else {
          set({ error: error.message });
        }
      } else {
        set({ error: error.message });
      }
    }
  },

  setGameState: (gameState: GameState) => {
    set({ gameState, loading: false, error: null });
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      gameId: null,
      gameState: null,
      loading: false,
      error: null,
    });
  },
}));

