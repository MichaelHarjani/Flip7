import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGameService } from '../_gameState.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gameId } = req.query;
    
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    const gameService = getGameService(gameId);
    
    if (!gameService) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = gameService.getGameState();
    res.json({ gameState });
  } catch (error) {
    console.error('Error getting game state:', error);
    res.status(500).json({ error: 'Failed to get game state' });
  }
}

