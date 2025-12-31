import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGameService } from '../_gameState.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gameId } = req.query;
    const { playerId } = req.body;
    
    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    const gameService = getGameService(gameId);
    
    if (!gameService) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = gameService.hit(playerId);
    res.json({ gameState });
  } catch (error: any) {
    console.error('Error hitting:', error);
    res.status(400).json({ error: error.message || 'Failed to hit' });
  }
}

