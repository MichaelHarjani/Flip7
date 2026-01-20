import { Response } from 'express';
import { GameService } from './gameService.js';
import { Room, GameAction } from '../types/multiplayer.js';
import type { GameState } from '../shared/types/index.js';

export class GameStateManager {
  private games = new Map<string, GameService>();
  private rooms = new Map<string, Room>();
  private sseClients = new Map<string, Set<Response>>(); // roomCode -> Set<SSE clients>

  createRoom(roomCode: string, hostId: string, hostName: string): Room {
    const room: Room = {
      roomCode,
      gameId: null,
      status: 'waiting',
      players: [{
        playerId: hostId,
        name: hostName,
        isHost: true,
        connected: true
      }],
      createdAt: new Date()
    };

    this.rooms.set(roomCode, room);
    this.sseClients.set(roomCode, new Set());

    console.log(`[GameStateManager] Room created: ${roomCode}, host: ${hostName} (${hostId})`);

    return room;
  }

  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  joinRoom(roomCode: string, playerId: string, playerName: string): Room {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'waiting') throw new Error('Room is not accepting players');

    // Check if player name already taken
    if (room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
      throw new Error('Player name already taken');
    }

    room.players.push({
      playerId,
      name: playerName,
      isHost: false,
      connected: true
    });

    console.log(`[GameStateManager] Player joined room ${roomCode}: ${playerName} (${playerId})`);

    this.broadcastRoomUpdate(roomCode);
    return room;
  }

  startGame(roomCode: string): GameState {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error('Room not found');
    if (room.players.length < 2) throw new Error('Need at least 2 players to start');

    const gameId = `game-${Date.now()}`;
    room.gameId = gameId;
    room.status = 'playing';

    // Initialize game with proper player IDs (no "player-" prefix from room, just UUID)
    const gameService = new GameService();
    const playerNames = room.players.map(p => p.name);
    const playerIds = room.players.map(p => p.playerId);

    console.log(`[GameStateManager] Starting game ${gameId} for room ${roomCode}`);
    console.log(`[GameStateManager] Players:`, room.players.map((p, i) => ({
      index: i,
      name: p.name,
      playerId: p.playerId
    })));

    const gameState = gameService.initializeGame(playerNames, [], playerIds);
    gameService.startRound();

    this.games.set(gameId, gameService);

    // Get updated state after starting round
    const updatedState = gameService.getGameState();

    if (!updatedState) {
      throw new Error('Failed to get game state after initialization');
    }

    console.log(`[GameStateManager] Game state created. Players in gameState:`, updatedState.players.map((p: any, i: number) => ({
      index: i,
      id: p.id,
      name: p.name
    })));

    // Broadcast to all connected clients
    this.broadcastGameState(roomCode, updatedState);

    return updatedState;
  }

  performAction(roomCode: string, action: GameAction): GameState {
    const room = this.rooms.get(roomCode);
    if (!room || !room.gameId) throw new Error('Game not found');

    const gameService = this.games.get(room.gameId);
    if (!gameService) throw new Error('Game instance not found');

    console.log(`[GameStateManager] Performing action:`, {
      roomCode,
      action: action.type,
      playerId: action.playerId
    });

    // Perform action
    let updatedState: GameState;
    switch (action.type) {
      case 'hit':
        updatedState = gameService.hit(action.playerId);
        break;
      case 'stay':
        updatedState = gameService.stay(action.playerId);
        break;
      case 'playActionCard':
        if (!action.cardId) throw new Error('cardId required for playActionCard');
        updatedState = gameService.playActionCard(
          action.playerId,
          action.cardId,
          action.targetPlayerId
        );
        break;
      case 'nextRound':
        updatedState = gameService.startNextRound();
        break;
      default:
        throw new Error('Invalid action type');
    }

    // Broadcast updated state
    this.broadcastGameState(roomCode, updatedState);
    return updatedState;
  }

  // SSE connection management
  addSSEClient(roomCode: string, res: Response): void {
    let clients = this.sseClients.get(roomCode);
    if (!clients) {
      clients = new Set();
      this.sseClients.set(roomCode, clients);
    }
    clients.add(res);
    console.log(`[GameStateManager] SSE client connected to room ${roomCode}. Total clients: ${clients.size}`);
  }

  removeSSEClient(roomCode: string, res: Response): void {
    const clients = this.sseClients.get(roomCode);
    if (clients) {
      clients.delete(res);
      console.log(`[GameStateManager] SSE client disconnected from room ${roomCode}. Total clients: ${clients.size}`);
    }
  }

  private broadcastGameState(roomCode: string, gameState: GameState): void {
    const clients = this.sseClients.get(roomCode);
    if (!clients || clients.size === 0) {
      console.log(`[GameStateManager] No SSE clients to broadcast to for room ${roomCode}`);
      return;
    }

    const event = {
      type: 'game:state',
      data: gameState
    };

    const message = `data: ${JSON.stringify(event)}\n\n`;

    console.log(`[GameStateManager] Broadcasting game:state to ${clients.size} clients in room ${roomCode}`);

    clients.forEach(client => {
      try {
        client.write(message);
      } catch (error) {
        console.error('[GameStateManager] Error writing to SSE client:', error);
        clients.delete(client);
      }
    });
  }

  private broadcastRoomUpdate(roomCode: string): void {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const clients = this.sseClients.get(roomCode);
    if (!clients || clients.size === 0) return;

    const event = {
      type: 'room:updated',
      data: room
    };

    const message = `data: ${JSON.stringify(event)}\n\n`;

    console.log(`[GameStateManager] Broadcasting room:updated to ${clients.size} clients in room ${roomCode}`);

    clients.forEach(client => {
      try {
        client.write(message);
      } catch (error) {
        console.error('[GameStateManager] Error writing to SSE client:', error);
        clients.delete(client);
      }
    });
  }
}

export const gameStateManager = new GameStateManager();
