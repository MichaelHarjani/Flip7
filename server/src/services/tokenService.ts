import jwt from 'jsonwebtoken';
import { PlayerToken } from '../types/multiplayer.js';

const JWT_SECRET = process.env.JWT_SECRET || 'flip7-dev-secret-change-in-production';

export class TokenService {
  static generateToken(player: {
    playerId: string;
    roomCode: string;
    playerName: string;
    isHost: boolean;
  }): string {
    const payload: PlayerToken = {
      playerId: player.playerId,
      roomCode: player.roomCode,
      playerName: player.playerName,
      isHost: player.isHost,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };

    return jwt.sign(payload, JWT_SECRET);
  }

  static verifyToken(token: string): PlayerToken | null {
    try {
      return jwt.verify(token, JWT_SECRET) as PlayerToken;
    } catch (error) {
      console.error('[TokenService] Token verification failed:', error);
      return null;
    }
  }
}
