import { v4 as uuidv4 } from 'uuid';
import type { GameRoom, PlayerSession } from '../shared/types/index.js';
import { sessionService } from './sessionService.js';

/**
 * Service for managing game rooms
 */
export class RoomService {
  private rooms = new Map<string, GameRoom>();
  private roomCodeToGameId = new Map<string, string>();

  /**
   * Generate a unique 6-character room code
   */
  generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let attempts = 0;
    
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
    } while (this.rooms.has(code) && attempts < 100);

    if (attempts >= 100) {
      throw new Error('Failed to generate unique room code');
    }

    return code;
  }

  /**
   * Create a new room
   */
  createRoom(hostName: string, maxPlayers: number = 4): { room: GameRoom; sessionId: string; playerId: string } {
    const roomCode = this.generateRoomCode();
    const sessionId = uuidv4();
    const playerId = `player-${uuidv4()}`;

    // Create host session
    const hostSession = sessionService.createSession(sessionId, playerId, hostName, true);

    const room: GameRoom = {
      roomCode,
      gameId: null,
      hostId: sessionId,
      players: [hostSession],
      maxPlayers,
      status: 'waiting',
      createdAt: new Date(),
    };

    this.rooms.set(roomCode, room);

    return { room, sessionId, playerId };
  }

  /**
   * Join a room by code
   */
  joinRoom(roomCode: string, playerName: string): { room: GameRoom; sessionId: string; playerId: string } | null {
    const room = this.rooms.get(roomCode);
    
    if (!room) {
      return null;
    }

    if (room.status !== 'waiting') {
      throw new Error('Room is not accepting new players');
    }

    // No max player limit - rooms can have unlimited players

    // Check if player name is already taken in this room
    if (room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
      throw new Error('Player name already taken');
    }

    const sessionId = uuidv4();
    const playerId = `player-${uuidv4()}`;

    // Create player session
    const playerSession = sessionService.createSession(sessionId, playerId, playerName, false);
    room.players.push(playerSession);

    // Associate session with room (via gameId if exists, or we'll set it when game starts)
    if (room.gameId) {
      sessionService.setGameId(sessionId, room.gameId);
    }

    return { room, sessionId, playerId };
  }

  /**
   * Leave a room
   */
  leaveRoom(roomCode: string, sessionId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return;
    }

    const playerIndex = room.players.findIndex(p => p.sessionId === sessionId);
    if (playerIndex === -1) {
      return;
    }

    const wasHost = room.players[playerIndex].isHost;
    room.players.splice(playerIndex, 1);

    // Remove session
    sessionService.removeSession(sessionId);

    // If host left, transfer host to first remaining player or delete room
    if (wasHost) {
      if (room.players.length > 0) {
        room.players[0].isHost = true;
        room.hostId = room.players[0].sessionId;
      } else {
        // No players left, delete room
        this.rooms.delete(roomCode);
        if (room.gameId) {
          this.roomCodeToGameId.delete(roomCode);
        }
        return;
      }
    }

    // If no players left, delete room
    if (room.players.length === 0) {
      this.rooms.delete(roomCode);
      if (room.gameId) {
        this.roomCodeToGameId.delete(roomCode);
      }
    }
  }

  /**
   * Get room by code
   */
  getRoom(roomCode: string): GameRoom | null {
    return this.rooms.get(roomCode) || null;
  }

  /**
   * Get room by gameId
   */
  getRoomByGameId(gameId: string): GameRoom | null {
    for (const [roomCode, gameIdForRoom] of this.roomCodeToGameId.entries()) {
      if (gameIdForRoom === gameId) {
        return this.rooms.get(roomCode) || null;
      }
    }
    return null;
  }

  /**
   * Set gameId for a room
   */
  setGameId(roomCode: string, gameId: string): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.gameId = gameId;
      this.roomCodeToGameId.set(roomCode, gameId);
      
      // Associate all player sessions with the game
      for (const player of room.players) {
        sessionService.setGameId(player.sessionId, gameId);
      }
    }
  }

  /**
   * Update room status
   */
  updateRoomStatus(roomCode: string, status: GameRoom['status']): void {
    const room = this.rooms.get(roomCode);
    if (room) {
      room.status = status;
    }
  }

  /**
   * Update player connection status in room
   */
  updatePlayerConnection(roomCode: string, sessionId: string, connected: boolean): void {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return;
    }

    const player = room.players.find(p => p.sessionId === sessionId);
    if (player) {
      player.connected = connected;
      player.lastSeen = new Date();
      sessionService.updateConnectionStatus(sessionId, connected);
    }
  }

  /**
   * Migrate host to a new player
   */
  migrateHost(roomCode: string, newHostSessionId: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return;
    }

    // Remove host status from all players
    room.players.forEach(p => {
      p.isHost = false;
    });

    // Set new host
    const newHost = room.players.find(p => p.sessionId === newHostSessionId);
    if (newHost) {
      newHost.isHost = true;
      room.hostId = newHostSessionId;
      sessionService.updateSession(newHostSessionId, { isHost: true });
    }
  }

  /**
   * Get all waiting rooms (for matchmaking)
   */
  getWaitingRooms(maxPlayers?: number): GameRoom[] {
    const waitingRooms: GameRoom[] = [];
    
    for (const room of this.rooms.values()) {
      if (room.status === 'waiting') {
        if (maxPlayers === undefined || room.maxPlayers === maxPlayers) {
          waitingRooms.push(room);
        }
      }
    }

    return waitingRooms;
  }

  /**
   * Clean up empty or old rooms
   */
  cleanupRooms(): void {
    const now = new Date();
    const roomsToDelete: string[] = [];

    for (const [roomCode, room] of this.rooms.entries()) {
      // Delete if no players
      if (room.players.length === 0) {
        roomsToDelete.push(roomCode);
        continue;
      }

      // Delete if room is ended and older than 1 hour
      if (room.status === 'ended') {
        const age = now.getTime() - room.createdAt.getTime();
        if (age > 3600000) { // 1 hour
          roomsToDelete.push(roomCode);
        }
      }
    }

    for (const roomCode of roomsToDelete) {
      const room = this.rooms.get(roomCode);
      if (room) {
        // Remove all player sessions
        for (const player of room.players) {
          sessionService.removeSession(player.sessionId);
        }
      }
      this.rooms.delete(roomCode);
      this.roomCodeToGameId.delete(roomCode);
    }
  }
}

// Singleton instance
export const roomService = new RoomService();

