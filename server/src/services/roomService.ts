import { v4 as uuidv4 } from 'uuid';
import type { GameRoom, PlayerSession } from '../shared/types/index.js';
import { sessionService } from './sessionService.js';
import { supabase, isSupabaseAvailable } from '../config/supabase.js';

/**
 * Service for managing game rooms
 * Supports dual-mode: in-memory (guests) + database (authenticated hosts)
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
  createRoom(hostName: string, maxPlayers: number = 4, userId?: string): { room: GameRoom; sessionId: string; playerId: string } {
    const roomCode = this.generateRoomCode();
    const sessionId = uuidv4();
    const playerId = `player-${uuidv4()}`;

    // Create host session (with optional userId for authenticated users)
    const hostSession = sessionService.createSession(sessionId, playerId, hostName, true, userId);

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

    // Persist to database if host is authenticated (async, fire and forget)
    if (this.shouldPersistRoom(sessionId)) {
      this.persistRoom(roomCode).catch(err => {
        console.error('[RoomService] Failed to persist room:', err);
      });

      // Persist host session
      sessionService.persistSession(sessionId, roomCode).catch(err => {
        console.error('[RoomService] Failed to persist host session:', err);
      });
    }

    return { room, sessionId, playerId };
  }

  /**
   * Join a room by code
   */
  joinRoom(roomCode: string, playerName: string, userId?: string): { room: GameRoom; sessionId: string; playerId: string } | null {
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

    // Create player session (with optional userId for authenticated users)
    const playerSession = sessionService.createSession(sessionId, playerId, playerName, false, userId);
    room.players.push(playerSession);

    // Associate session with room (via gameId if exists, or we'll set it when game starts)
    if (room.gameId) {
      sessionService.setGameId(sessionId, room.gameId);
    }

    // Persist session and participant if authenticated (async, fire and forget)
    if (userId) {
      sessionService.persistSession(sessionId, roomCode, room.gameId || undefined).catch(err => {
        console.error('[RoomService] Failed to persist player session:', err);
      });
    }

    // Add participant to room in DB if room or player is authenticated
    if (this.shouldPersistRoom(room.hostId) || userId) {
      this.addParticipant(roomCode, sessionId).catch(err => {
        console.error('[RoomService] Failed to add participant:', err);
      });
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

      // Update room in database if persisted
      if (this.shouldPersistRoom(room.hostId)) {
        this.persistRoom(roomCode).catch(err => {
          console.error('[RoomService] Failed to update room gameId:', err);
        });

        // Update all player sessions in DB
        for (const player of room.players) {
          sessionService.persistSession(player.sessionId, roomCode, gameId).catch(err => {
            console.error('[RoomService] Failed to update player session gameId:', err);
          });
        }
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

  /**
   * Check if room should persist to database (host is authenticated)
   */
  shouldPersistRoom(hostSessionId: string): boolean {
    if (!isSupabaseAvailable()) {
      return false;
    }
    return sessionService.isAuthenticatedSession(hostSessionId);
  }

  /**
   * Persist room to database (authenticated hosts only)
   */
  async persistRoom(roomCode: string): Promise<void> {
    if (!isSupabaseAvailable()) {
      return;
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      return;
    }

    // Only persist if host is authenticated
    if (!this.shouldPersistRoom(room.hostId)) {
      return;
    }

    // Get host's userId from session
    const hostSession = sessionService.getSession(room.hostId);
    if (!hostSession || !('userId' in hostSession) || !hostSession.userId) {
      return;
    }

    await supabase!.from('rooms').upsert({
      room_code: roomCode,
      game_id: room.gameId || null,
      host_user_id: hostSession.userId,
      max_players: room.maxPlayers,
      status: room.status,
      created_at: room.createdAt.toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });
  }

  /**
   * Load room from database
   */
  async loadRoom(roomCode: string): Promise<GameRoom | null> {
    if (!isSupabaseAvailable()) {
      return null;
    }

    const { data, error } = await supabase!
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if room is expired
    if (new Date(data.expires_at) < new Date()) {
      return null;
    }

    // Load room participants
    const { data: participants } = await supabase!
      .from('room_participants')
      .select('*')
      .eq('room_code', roomCode);

    // Reconstruct room with sessions
    const players: PlayerSession[] = [];
    if (participants) {
      for (const participant of participants) {
        // Try to load session from DB
        const session = await sessionService.loadSession(participant.session_id);
        if (session) {
          players.push(session);
        }
      }
    }

    const room: GameRoom = {
      roomCode: data.room_code,
      gameId: data.game_id,
      hostId: participants?.find(p => p.is_host)?.session_id || '',
      players,
      maxPlayers: data.max_players,
      status: data.status,
      createdAt: new Date(data.created_at),
    };

    // Store in memory
    this.rooms.set(roomCode, room);
    if (data.game_id) {
      this.roomCodeToGameId.set(roomCode, data.game_id);
    }

    return room;
  }

  /**
   * Add participant to room in database
   */
  async addParticipant(roomCode: string, sessionId: string): Promise<void> {
    if (!isSupabaseAvailable()) {
      return;
    }

    const room = this.rooms.get(roomCode);
    const session = sessionService.getSession(sessionId);

    if (!room || !session) {
      return;
    }

    // Only persist if session is authenticated OR room host is authenticated
    const isSessionAuthenticated = sessionService.isAuthenticatedSession(sessionId);
    const isRoomPersisted = this.shouldPersistRoom(room.hostId);

    if (!isSessionAuthenticated && !isRoomPersisted) {
      return;
    }

    // Get userId if authenticated, otherwise null for guest participants
    const userId = ('userId' in session && session.userId) ? session.userId : null;

    await supabase!.from('room_participants').upsert({
      room_code: roomCode,
      user_id: userId,
      session_id: sessionId,
      player_name: session.name,
      is_host: session.isHost,
      joined_at: new Date().toISOString(),
    });
  }
}

// Singleton instance
export const roomService = new RoomService();

