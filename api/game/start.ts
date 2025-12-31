import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createGameService, setGameService } from './_gameState.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerNames, aiDifficulties } = req.body;
    
    if (!playerNames || !Array.isArray(playerNames) || playerNames.length < 1) {
      return res.status(400).json({ error: 'Invalid player names' });
    }

    const gameId = `game-${Date.now()}`;
    const gameService = createGameService();
    const gameState = gameService.initializeGame(playerNames, aiDifficulties || []);
    
    setGameService(gameId, gameService);

    res.json({ gameId, gameState });
  } catch (error) {
    console.error('Error starting game:', error);
    res.status(500).json({ error: 'Failed to start game' });
  }
}

