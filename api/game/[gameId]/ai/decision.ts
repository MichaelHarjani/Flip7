import type { VercelRequest, VercelResponse } from '@vercel/node';
import { makeAIDecision } from '../../../server/src/ai/aiPlayer.js';

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
    const { playerId, gameState } = req.body;
    
    if (!gameState) {
      return res.status(400).json({ error: 'Game state is required' });
    }

    const player = gameState.players.find((p: any) => p.id === playerId);
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
