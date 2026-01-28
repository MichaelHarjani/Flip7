import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createGameService } from '../_gameState.js';

/**
 * Handler for game action routes:
 *   POST /api/game/{gameId}/round/start     -> Start a round
 *   POST /api/game/{gameId}/round/next      -> Start next round
 *   POST /api/game/{gameId}/hit             -> Player hits
 *   POST /api/game/{gameId}/stay            -> Player stays
 *   POST /api/game/{gameId}/action          -> Play action card
 *   POST /api/game/{gameId}/state           -> Get game state
 *   POST /api/game/{gameId}/ai/decision     -> Get AI decision
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get gameId from dynamic route
  const gameId = req.query.gameId as string;

  // Get action segments from catch-all
  const actionParam = req.query.action ?? req.query['...action'] ?? req.query['[...action]'];
  let actionParts: string[];

  if (Array.isArray(actionParam)) {
    actionParts = actionParam.filter((p): p is string => typeof p === 'string');
  } else if (typeof actionParam === 'string') {
    actionParts = actionParam.split('/').filter(p => p.length > 0);
  } else {
    actionParts = [];
  }

  console.log('[API Action] GameId:', gameId, 'ActionParts:', actionParts, 'Query:', req.query);

  if (!gameId || actionParts.length === 0) {
    return res.status(400).json({
      error: 'Invalid request',
      debug: { gameId, actionParts, query: req.query }
    });
  }

  const action = mapActionParts(actionParts);
  console.log('[API Action] Mapped action:', action);

  try {
    return handleGameAction(req, res, gameId, action);
  } catch (error: any) {
    console.error('[API Action] Unhandled error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

/**
 * Map action path segments to action name
 */
function mapActionParts(parts: string[]): string {
  if (parts.length === 2 && parts[0] === 'round' && parts[1] === 'start') return 'round-begin';
  if (parts.length === 2 && parts[0] === 'round' && parts[1] === 'next') return 'round-next';
  if (parts.length === 2 && parts[0] === 'ai' && parts[1] === 'decision') return 'ai-decision';
  return parts[0]; // 'hit', 'stay', 'action', 'state'
}

/**
 * Handle game actions
 */
async function handleGameAction(
  req: VercelRequest,
  res: VercelResponse,
  gameId: string,
  action: string
) {
  const { gameState: incomingState, playerId, cardId, targetPlayerId } = req.body;

  if (!incomingState) {
    console.error('[API Action] Missing gameState in request body');
    return res.status(400).json({ error: 'Game state is required' });
  }

  console.log('[API Action] Restoring game state, status:', incomingState.gameStatus);

  // Validate gameState has required fields
  if (!incomingState.players || !Array.isArray(incomingState.players) || incomingState.players.length === 0) {
    console.error('[API Action] Invalid gameState: missing or empty players array');
    return res.status(400).json({ error: 'Invalid game state: players array is required' });
  }

  if (!incomingState.deck || !Array.isArray(incomingState.deck)) {
    console.error('[API Action] Invalid gameState: missing or invalid deck');
    return res.status(400).json({ error: 'Invalid game state: deck is required' });
  }

  console.log('[API Action] GameState validation passed. Players:', incomingState.players.length, 'Deck size:', incomingState.deck.length);

  // Create a new game service and restore state
  const gameService = createGameService();
  try {
    gameService.restoreState(incomingState);
  } catch (error: any) {
    console.error('[API Action] Error restoring state:', error);
    return res.status(400).json({ error: `Failed to restore game state: ${error.message}` });
  }

  let gameState;

  switch (action) {
    case 'round-begin':
      console.log('[API Action] Starting round');
      try {
        gameState = gameService.startRound();
        console.log('[API Action] Round started successfully, new status:', gameState.gameStatus);
      } catch (error: any) {
        console.error('[API Action] Error in startRound:', error);
        throw error;
      }
      break;

    case 'round-next':
      gameState = gameService.startNextRound();
      break;

    case 'hit':
      if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required' });
      }
      gameState = gameService.hit(playerId);
      break;

    case 'stay':
      if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required' });
      }
      gameState = gameService.stay(playerId);
      break;

    case 'action':
      if (!playerId || !cardId) {
        return res.status(400).json({ error: 'Player ID and card ID are required' });
      }
      gameState = gameService.playActionCard(playerId, cardId, targetPlayerId);
      break;

    case 'state':
      gameState = gameService.getState();
      break;

    case 'ai-decision':
      if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required' });
      }
      const decision = gameService.makeAIDecision(playerId);
      return res.json({ decision });

    default:
      return res.status(404).json({ error: `Unknown action: ${action}` });
  }

  return res.json({ gameState });
}
