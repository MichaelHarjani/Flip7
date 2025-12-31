import express from 'express';
import { GameService } from '../services/gameService';
import { makeAIDecision } from '../ai/aiPlayer';
const router = express.Router();
// Store game instances (in production, use Redis or database)
const gameInstances = new Map();
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
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
    }
    catch (error) {
        res.status(400).json({ error: error.message || 'Failed to get AI decision' });
    }
});
export default router;
