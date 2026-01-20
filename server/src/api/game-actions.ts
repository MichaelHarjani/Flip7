import { Router } from 'express';
import { gameStateManager } from '../services/gameStateManager.js';
import { authenticate } from '../middleware/auth.js';
import { GameAction } from '../types/multiplayer.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/game/start
router.post('/start', (req, res) => {
  const { roomCode, playerId, isHost } = req.playerToken!;

  if (!isHost) {
    return res.status(403).json({ error: 'Only host can start game' });
  }

  try {
    const gameState = gameStateManager.startGame(roomCode);
    res.json({ gameState });
  } catch (error: any) {
    console.error('[Game Actions API] Error starting game:', error);
    res.status(400).json({ error: error.message || 'Failed to start game' });
  }
});

// POST /api/game/action
router.post('/action', (req, res) => {
  const { roomCode, playerId } = req.playerToken!;
  const { type, cardId, targetPlayerId } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Action type is required' });
  }

  const validTypes = ['hit', 'stay', 'playActionCard', 'nextRound'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid action type' });
  }

  const action: GameAction = {
    type,
    playerId,
    cardId,
    targetPlayerId
  };

  try {
    const gameState = gameStateManager.performAction(roomCode, action);
    res.json({ gameState });
  } catch (error: any) {
    console.error('[Game Actions API] Error performing action:', error);
    res.status(400).json({ error: error.message || 'Action failed' });
  }
});

export default router;
