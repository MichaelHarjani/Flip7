import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createGameService } from '../_gameState.js';

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
    const { gameState: incomingState } = req.body;
    
    if (!incomingState) {
      return res.status(400).json({ error: 'Game state is required' });
    }

    // Create a new game service and restore state
    const gameService = createGameService();
    gameService.restoreState(incomingState);

    const gameState = gameService.startRound();
    res.json({ gameState });
  } catch (error: any) {
    console.error('Error starting round:', error);
    res.status(500).json({ error: error.message || 'Failed to start round' });
  }
}

