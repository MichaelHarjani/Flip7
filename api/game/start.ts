import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createGameService, setGameService } from './_gameState.js';

/**
 * Handler for POST /api/game/start - Create a new game
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[API Start] Handler called, body:', JSON.stringify(req.body));
    const { playerNames, aiDifficulties } = req.body;

    if (!playerNames || !Array.isArray(playerNames) || playerNames.length < 1) {
      return res.status(400).json({ error: 'Invalid player names' });
    }

    console.log('[API Start] Creating game service...');
    const gameId = `game-${Date.now()}`;
    const gameService = createGameService();
    console.log('[API Start] Game service created, initializing game...');
    const gameState = gameService.initializeGame(playerNames, aiDifficulties || []);
    console.log('[API Start] Game initialized successfully');

    setGameService(gameId, gameService);

    return res.json({ gameId, gameState });
  } catch (error: any) {
    console.error('[API Start] Error starting game:', error);
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack || 'No stack trace';
    console.error('[API Start] Error details:', { errorMessage, errorStack });

    return res.status(500).json({
      error: 'Failed to start game',
      details: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
}
