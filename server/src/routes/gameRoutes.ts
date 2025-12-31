import express from 'express';
import { GameService } from '../services/gameService';
import { makeAIDecision } from '../ai/aiPlayer';
import { roomService } from '../services/roomService';
import { matchmakingService } from '../services/matchmakingService';

const router = express.Router();

// Store game instances (in production, use Redis or database)
const gameInstances = new Map<string, GameService>();

/**
 * Initialize a new game
 */
router.post('/start', (req, res) => {
  try {
    const { playerNames, aiDifficulties } = req.body;
    
    if (!playerNames || !Array.isArray(playerNames) || playerNames.length < 1) {
      return res.status(400).json({ error: 'Invalid player names' });
    }

    const gameId = `game-${Date.now()}`;
    const gameService = new GameService();
    const gameState = gameService.initializeGame(playerNames, aiDifficulties || []);
    
    gameInstances.set(gameId, gameService);

    res.json({ gameId, gameState });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start game' });
  }
});

/**
 * Start a round
 */
router.post('/:gameId/round/start', (req, res) => {
  try {
    const { gameId } = req.params;
    const gameService = gameInstances.get(gameId);
    
    if (!gameService) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = gameService.startRound();
    res.json({ gameState });
  } catch (error: any) {
    console.error('Error starting round:', error);
    res.status(500).json({ error: error.message || 'Failed to start round' });
  }
});

/**
 * Player hits
 */
router.post('/:gameId/hit', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;
    const gameService = gameInstances.get(gameId);
    
    if (!gameService) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = gameService.hit(playerId);
    res.json({ gameState });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to hit' });
  }
});

/**
 * Player stays
 */
router.post('/:gameId/stay', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;
    const gameService = gameInstances.get(gameId);
    
    if (!gameService) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = gameService.stay(playerId);
    res.json({ gameState });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to stay' });
  }
});

/**
 * Play action card
 */
router.post('/:gameId/action', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId, cardId, targetPlayerId } = req.body;
    const gameService = gameInstances.get(gameId);
    
    if (!gameService) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = gameService.playActionCard(playerId, cardId, targetPlayerId);
    res.json({ gameState });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to play action card' });
  }
});

/**
 * Get game state
 */
router.get('/:gameId/state', (req, res) => {
  try {
    const { gameId } = req.params;
    const gameService = gameInstances.get(gameId);
    
    if (!gameService) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = gameService.getGameState();
    res.json({ gameState });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get game state' });
  }
});

/**
 * Start next round
 */
router.post('/:gameId/round/next', (req, res) => {
  try {
    const { gameId } = req.params;
    const gameService = gameInstances.get(gameId);
    
    if (!gameService) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = gameService.startNextRound();
    res.json({ gameState });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to start next round' });
  }
});

/**
 * Get AI decision
 */
router.post('/:gameId/ai/decision', (req, res) => {
  try {
    const { gameId } = req.params;
    const { playerId } = req.body;
    const gameService = gameInstances.get(gameId);
    
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

    const decision = makeAIDecision(player, gameState, player.aiDifficulty);
    res.json({ decision });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to get AI decision' });
  }
});

/**
 * Room management endpoints
 */

/**
 * Create a new room
 */
router.post('/rooms/create', (req, res) => {
  try {
    const { playerName, maxPlayers } = req.body;
    
    if (!playerName || typeof playerName !== 'string') {
      return res.status(400).json({ error: 'Invalid player name' });
    }

    const { room, sessionId, playerId } = roomService.createRoom(
      playerName,
      maxPlayers || 4
    );

    res.json({ room, sessionId, playerId });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create room' });
  }
});

/**
 * Join a room by code
 */
router.post('/rooms/join', (req, res) => {
  try {
    const { roomCode, playerName } = req.body;
    
    if (!roomCode || typeof roomCode !== 'string') {
      return res.status(400).json({ error: 'Invalid room code' });
    }

    if (!playerName || typeof playerName !== 'string') {
      return res.status(400).json({ error: 'Invalid player name' });
    }

    const result = roomService.joinRoom(roomCode, playerName);
    
    if (!result) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to join room' });
  }
});

/**
 * Leave a room
 */
router.post('/rooms/:roomCode/leave', (req, res) => {
  try {
    const { roomCode } = req.params;
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    roomService.leaveRoom(roomCode, sessionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to leave room' });
  }
});

/**
 * Get room info
 */
router.get('/rooms/:roomCode', (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = roomService.getRoom(roomCode);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to get room' });
  }
});

/**
 * Matchmaking endpoints
 */

/**
 * Join matchmaking queue
 */
router.post('/matchmaking/join', (req, res) => {
  try {
    const { playerName, maxPlayers } = req.body;
    
    if (!playerName || typeof playerName !== 'string') {
      return res.status(400).json({ error: 'Invalid player name' });
    }

    const result = matchmakingService.addToQueue(playerName, maxPlayers || 4);
    
    if (result) {
      res.json(result);
    } else {
      res.json({ queued: true, message: 'Added to matchmaking queue' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to join matchmaking' });
  }
});

/**
 * Leave matchmaking queue
 */
router.post('/matchmaking/leave', (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    matchmakingService.removeFromQueue(sessionId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to leave matchmaking' });
  }
});

export default router;

