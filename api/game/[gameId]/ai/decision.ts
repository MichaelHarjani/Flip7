import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGameService } from '../../_gameState.js';
import { makeAIDecision } from '../../../../server/src/ai/aiPlayer.js';

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

    const gameState = gameService.getGameState();
    if (!gameState) {
      return res.status(404).json({ error: 'Game state not found' });
    }

    const player = gameState.players.find(p => p.id === playerId);
    if (!player || !player.isAI) {
      return res.status(400).json({ error: 'Player not found or not AI' });
    }

    const decision = makeAIDecision(player, gameState, player.aiDifficulty || 'moderate');
    res.json({ decision });
  } catch (error: any) {
    console.error('Error getting AI decision:', error);
    res.status(400).json({ error: error.message || 'Failed to get AI decision' });
  }
}

