import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createGameService, setGameService } from './_gameState.js';

/**
 * Consolidated API handler for all game routes
 *
 * Routes:
 *   POST /api/game/start                    -> Start a new game
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

  // Parse path from catch-all route
  // Vercel puts the path segments in req.query.path for [...path].ts files
  // The key might vary depending on Vercel version (path, ...path, or [...path])
  const pathParam = req.query.path ?? req.query['...path'] ?? req.query['[...path]'];
  let path: string[];

  if (Array.isArray(pathParam)) {
    path = pathParam.filter((p): p is string => typeof p === 'string');
  } else if (typeof pathParam === 'string') {
    path = pathParam.split('/').filter(p => p.length > 0);
  } else {
    path = [];
  }

  console.log('[API] Path:', path, 'Raw query.path:', pathParam, 'Full query:', req.query);

  try {
    // Route: POST /api/game/start
    if (path.length === 1 && path[0] === 'start') {
      return handleStartGame(req, res);
    }

    // Route: POST /api/game/{gameId}/{action...}
    if (path.length >= 2) {
      const gameId = path[0];
      const actionParts = path.slice(1);
      const action = mapActionParts(actionParts);

      console.log('[API] GameId:', gameId, 'Action:', action, 'ActionParts:', actionParts);

      return handleGameAction(req, res, gameId, action);
    }

    // No matching route
    console.error('[API] No matching route for path:', path);
    return res.status(404).json({
      error: 'Not found',
      debug: {
        path,
        pathParam,
        url: req.url,
        query: req.query
      }
    });
  } catch (error: any) {
    console.error('[API] Unhandled error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
 * Handle POST /api/game/start - Create a new game
 */
async function handleStartGame(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    console.log('[API] Start game called, body:', JSON.stringify(req.body));
    const { playerNames, aiDifficulties } = req.body;

    if (!playerNames || !Array.isArray(playerNames) || playerNames.length < 1) {
      return res.status(400).json({ error: 'Invalid player names' });
    }

    console.log('[API] Creating game service...');
    const gameId = `game-${Date.now()}`;
    const gameService = createGameService();
    console.log('[API] Game service created, initializing game...');
    const gameState = gameService.initializeGame(playerNames, aiDifficulties || []);
    console.log('[API] Game initialized successfully');

    setGameService(gameId, gameService);

    return res.json({ gameId, gameState });
  } catch (error: any) {
    console.error('[API] Error starting game:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack || 'No stack trace';
    console.error('[API] Error details:', { errorMessage, errorStack });

    return res.status(500).json({
      error: 'Failed to start game',
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
}

/**
 * Handle game actions (round/start, hit, stay, etc.)
 */
async function handleGameAction(
  req: VercelRequest,
  res: VercelResponse,
  gameId: string,
  action: string
) {
  const { gameState: incomingState, playerId, cardId, targetPlayerId } = req.body;

  if (!incomingState) {
    console.error('[API] Missing gameState in request body');
    return res.status(400).json({ error: 'Game state is required' });
  }

  console.log('[API] Restoring game state, status:', incomingState.gameStatus);

  // Validate gameState has required fields
  if (!incomingState.players || !Array.isArray(incomingState.players) || incomingState.players.length === 0) {
    console.error('[API] Invalid gameState: missing or empty players array');
    return res.status(400).json({ error: 'Invalid game state: players array is required' });
  }

  if (!incomingState.deck || !Array.isArray(incomingState.deck)) {
    console.error('[API] Invalid gameState: missing or invalid deck');
    return res.status(400).json({ error: 'Invalid game state: deck is required' });
  }

  console.log('[API] GameState validation passed. Players:', incomingState.players.length, 'Deck size:', incomingState.deck.length);

  // Create a new game service and restore state
  const gameService = createGameService();
  try {
    gameService.restoreState(incomingState);
  } catch (error: any) {
    console.error('[API] Error restoring state:', error);
    return res.status(400).json({ error: `Failed to restore game state: ${error.message}` });
  }

  let gameState;

  switch (action) {
    case 'round-begin':
      console.log('[API] Starting round');
      try {
        gameState = gameService.startRound();
        console.log('[API] Round started successfully, new status:', gameState.gameStatus);
      } catch (error: any) {
        console.error('[API] Error in startRound:', error);
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
