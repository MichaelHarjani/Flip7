import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createGameService } from './_gameState.js';

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

  // Only allow POST requests for game actions
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the path from the catch-all route
    // In Vercel, catch-all routes like [...path] put segments in req.query.path
    const pathSegments = req.query.path;
    let path: string[];
    
    if (Array.isArray(pathSegments)) {
      path = pathSegments.filter((p): p is string => typeof p === 'string');
    } else if (typeof pathSegments === 'string') {
      // If it's a string, split by '/' in case Vercel gives us the full path
      path = pathSegments.split('/').filter(p => p.length > 0);
    } else {
      path = [];
    }
    
    console.log('[API] Path segments:', pathSegments, 'Parsed path:', path);
    
    // Extract gameId and action from path
    // Expected formats:
    // - [gameId, 'round-begin']
    // - [gameId, 'round-next']
    // - [gameId, 'hit']
    // - [gameId, 'stay']
    // - [gameId, 'action']
    // - [gameId, 'state']
    // - [gameId, 'ai', 'decision']
    
    if (path.length < 2) {
      console.error('[API] Invalid path length:', path.length, 'Path:', path);
      return res.status(400).json({ error: `Invalid path: expected at least 2 segments, got ${path.length}` });
    }

    const gameId = path[0];
    const action = path.length === 3 && path[1] === 'ai' ? 'ai-decision' : path[1];
    
    console.log('[API] GameId:', gameId, 'Action:', action);
    
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

    res.json({ gameState });
  } catch (error: any) {
    console.error('Error in game handler:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}



