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
    const pathSegments = req.query.path;
    const path = Array.isArray(pathSegments) ? pathSegments : [pathSegments];
    
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
      return res.status(400).json({ error: 'Invalid path' });
    }

    const gameId = path[0];
    const action = path.length === 3 && path[1] === 'ai' ? 'ai-decision' : path[1];
    
    const { gameState: incomingState, playerId, cardId, targetPlayerId } = req.body;
    
    if (!incomingState) {
      return res.status(400).json({ error: 'Game state is required' });
    }

    // Create a new game service and restore state
    const gameService = createGameService();
    gameService.restoreState(incomingState);

    let gameState;
    
    switch (action) {
      case 'round-begin':
        gameState = gameService.startRound();
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



