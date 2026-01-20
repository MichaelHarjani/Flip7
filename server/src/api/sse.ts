import { Router } from 'express';
import { gameStateManager } from '../services/gameStateManager.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/sse/:roomCode
router.get('/:roomCode', authenticate, (req, res) => {
  const { roomCode } = req.params;
  const playerToken = req.playerToken!;

  // Verify player is in the room
  if (playerToken.roomCode !== roomCode.toUpperCase()) {
    return res.status(403).json({ error: 'Player not authorized for this room' });
  }

  // Verify room exists
  const room = gameStateManager.getRoom(roomCode.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  console.log(`[SSE] Client connecting to room ${roomCode}: ${playerToken.playerName} (${playerToken.playerId})`);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering in nginx

  // Add client to room's SSE clients
  gameStateManager.addSSEClient(roomCode.toUpperCase(), res);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`[SSE] Client disconnected from room ${roomCode}: ${playerToken.playerName} (${playerToken.playerId})`);
    gameStateManager.removeSSEClient(roomCode.toUpperCase(), res);
  });
});

export default router;
