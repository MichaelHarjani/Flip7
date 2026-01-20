import { Router } from 'express';
import { gameStateManager } from '../services/gameStateManager.js';
import { TokenService } from '../services/tokenService.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// POST /api/rooms/create
router.post('/create', (req, res) => {
  const { playerName } = req.body;

  if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  const roomCode = generateRoomCode();
  const playerId = uuid();

  try {
    const room = gameStateManager.createRoom(roomCode, playerId, playerName.trim());

    const token = TokenService.generateToken({
      playerId,
      roomCode,
      playerName: playerName.trim(),
      isHost: true
    });

    res.json({ room, token });
  } catch (error: any) {
    console.error('[Rooms API] Error creating room:', error);
    res.status(500).json({ error: error.message || 'Failed to create room' });
  }
});

// POST /api/rooms/join
router.post('/join', (req, res) => {
  const { roomCode, playerName } = req.body;

  if (!roomCode || typeof roomCode !== 'string') {
    return res.status(400).json({ error: 'Room code is required' });
  }

  if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  const playerId = uuid();

  try {
    const room = gameStateManager.joinRoom(roomCode.toUpperCase(), playerId, playerName.trim());

    const token = TokenService.generateToken({
      playerId,
      roomCode: roomCode.toUpperCase(),
      playerName: playerName.trim(),
      isHost: false
    });

    res.json({ room, token });
  } catch (error: any) {
    console.error('[Rooms API] Error joining room:', error);
    res.status(400).json({ error: error.message || 'Failed to join room' });
  }
});

// GET /api/rooms/:roomCode
router.get('/:roomCode', (req, res) => {
  const { roomCode } = req.params;

  try {
    const room = gameStateManager.getRoom(roomCode.toUpperCase());

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room });
  } catch (error: any) {
    console.error('[Rooms API] Error getting room:', error);
    res.status(500).json({ error: error.message || 'Failed to get room' });
  }
});

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default router;
