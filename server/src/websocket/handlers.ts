import type { Server, Socket } from 'socket.io';
import type { GameState } from '../shared/types/index.js';
import { roomService } from '../services/roomService.js';
import { sessionService } from '../services/sessionService.js';
import { matchmakingService } from '../services/matchmakingService.js';
import { GameService } from '../services/gameService.js';
import { makeAIDecision } from '../ai/aiPlayer.js';

// Store game instances
const gameInstances = new Map<string, GameService>();

/**
 * Setup WebSocket event handlers
 */
export function setupWebSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle room creation
    socket.on('room:create', async (data: { playerName: string; maxPlayers?: number }) => {
      try {
        const { room, sessionId, playerId } = roomService.createRoom(
          data.playerName,
          data.maxPlayers || 4
        );

        // Join socket room
        socket.join(room.roomCode);
        socket.data.sessionId = sessionId;
        socket.data.playerId = playerId;
        socket.data.roomCode = room.roomCode;

        // Emit room created
        socket.emit('room:created', {
          room,
          sessionId,
          playerId,
        });

        // Broadcast to room that player joined
        io.to(room.roomCode).emit('room:updated', { room });
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to create room' });
      }
    });

    // Handle room join
    socket.on('room:join', async (data: { roomCode: string; playerName: string }) => {
      try {
        const result = roomService.joinRoom(data.roomCode, data.playerName);
        if (!result) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        const { room, sessionId, playerId } = result;

        // Join socket room
        socket.join(room.roomCode);
        socket.data.sessionId = sessionId;
        socket.data.playerId = playerId;
        socket.data.roomCode = room.roomCode;

        // Update connection status
        roomService.updatePlayerConnection(room.roomCode, sessionId, true);

        // Emit room joined
        socket.emit('room:joined', {
          room,
          sessionId,
          playerId,
        });

        // Broadcast to room that player joined
        io.to(room.roomCode).emit('room:updated', { room });
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to join room' });
      }
    });

    // Handle room leave
    socket.on('room:leave', () => {
      const roomCode = socket.data.roomCode;
      const sessionId = socket.data.sessionId;

      if (roomCode && sessionId) {
        roomService.leaveRoom(roomCode, sessionId);
        socket.leave(roomCode);

        // Broadcast to room that player left
        const room = roomService.getRoom(roomCode);
        if (room) {
          io.to(roomCode).emit('room:updated', { room });
        }
      }
    });

    // Handle matchmaking
    socket.on('matchmaking:join', async (data: { playerName: string; maxPlayers?: number }) => {
      try {
        const result = matchmakingService.addToQueue(data.playerName, data.maxPlayers || 4);
        
        if (result) {
          const { roomCode, sessionId, playerId } = result;
          const room = roomService.getRoom(roomCode);
          
          if (room) {
            // Join socket room
            socket.join(roomCode);
            socket.data.sessionId = sessionId;
            socket.data.playerId = playerId;
            socket.data.roomCode = roomCode;

            // Update connection status
            roomService.updatePlayerConnection(roomCode, sessionId, true);

            socket.emit('matchmaking:matched', {
              room,
              sessionId,
              playerId,
            });

            // Broadcast to room
            io.to(roomCode).emit('room:updated', { room });
          }
        } else {
          socket.emit('matchmaking:queued', {
            message: 'Added to queue',
          });
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to join matchmaking' });
      }
    });

    // Handle game start
    socket.on('game:start', async () => {
      const roomCode = socket.data.roomCode;
      const sessionId = socket.data.sessionId;

      if (!roomCode || !sessionId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = roomService.getRoom(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Check if user is host
      const player = room.players.find(p => p.sessionId === sessionId);
      if (!player || !player.isHost) {
        socket.emit('error', { message: 'Only host can start the game' });
        return;
      }

      if (room.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
      }

      try {
        // Initialize game
        const gameId = `game-${Date.now()}`;
        const gameService = new GameService();

        // Create player names and IDs arrays from sessions
        const playerNames = room.players.map(p => p.name);
        const playerIds = room.players.map(p => p.playerId);

        console.log(`[Game Start] Initializing game ${gameId} with ${playerNames.length} players`);
        console.log(`[Game Start] Room object:`, JSON.stringify(room, null, 2));
        console.log(`[Game Start] Player mapping:`, room.players.map((p, i) => ({
          index: i,
          name: p.name,
          playerId: p.playerId,
          hasPlayerId: !!p.playerId,
          playerIdType: typeof p.playerId,
          playerIdValue: p.playerId,
          sessionId: p.sessionId,
          isHost: p.isHost
        })));

        console.log(`[Game Start] playerNames array:`, playerNames);
        console.log(`[Game Start] playerIds array:`, playerIds);
        console.log(`[Game Start] playerIds array detail:`, playerIds.map((id, i) => ({
          index: i,
          value: id,
          type: typeof id,
          truthy: !!id,
          length: id?.length
        })));
        console.log(`[Game Start] playerIds length:`, playerIds?.length, 'playerNames length:', playerNames?.length);

        const gameState = gameService.initializeGame(playerNames, [], playerIds); // No AI players in multiplayer

        console.log(`[Game Start] Game state players:`, gameState.players.map((p, i) => ({
          index: i,
          id: p.id,
          name: p.name,
          isAI: p.isAI
        })));
        console.log(`[Game Start] Current player index: ${gameState.currentPlayerIndex}, Current player: ${gameState.players[gameState.currentPlayerIndex]?.name}`);


        // Store game instance
        gameInstances.set(gameId, gameService);

        // Set gameId for room
        roomService.setGameId(roomCode, gameId);
        roomService.updateRoomStatus(roomCode, 'starting');

        // Start first round
        console.log(`[Game Start] Starting first round for game ${gameId}`);
        const updatedGameState = gameService.startRound();

        // Only update room status to 'playing' AFTER startRound succeeds
        roomService.updateRoomStatus(roomCode, 'playing');

        console.log(`[Game Start] Broadcasting game state to room ${roomCode}, status: ${updatedGameState.gameStatus}`);

        // Broadcast game state to all players in the room
        io.to(roomCode).emit('game:state', { gameState: updatedGameState });
      } catch (error: any) {
        console.error(`[Game Start] Error starting game for room ${roomCode}:`, error);

        // Rollback room status on error
        roomService.updateRoomStatus(roomCode, 'waiting');

        // Broadcast error to ALL players in the room, not just the host
        io.to(roomCode).emit('error', { message: error.message || 'Failed to start game' });
      }
    });

    // Handle player action: hit
    socket.on('game:hit', async (data: { playerId: string }) => {
      const roomCode = socket.data.roomCode;
      const sessionId = socket.data.sessionId;

      if (!roomCode || !sessionId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = roomService.getRoom(roomCode);
      if (!room || !room.gameId) {
        socket.emit('error', { message: 'Game not started' });
        return;
      }

      const gameService = gameInstances.get(room.gameId);
      if (!gameService) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Validate player
      if (socket.data.playerId !== data.playerId) {
        socket.emit('error', { message: 'Invalid player' });
        return;
      }

      try {
        const gameState = gameService.hit(data.playerId);
        
        // Broadcast updated game state
        io.to(roomCode).emit('game:state', { gameState });

        // Handle AI players
        await processAITurns(io, roomCode, room.gameId, gameService);
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to hit' });
      }
    });

    // Handle player action: stay
    socket.on('game:stay', async (data: { playerId: string }) => {
      const roomCode = socket.data.roomCode;
      const sessionId = socket.data.sessionId;

      if (!roomCode || !sessionId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = roomService.getRoom(roomCode);
      if (!room || !room.gameId) {
        socket.emit('error', { message: 'Game not started' });
        return;
      }

      const gameService = gameInstances.get(room.gameId);
      if (!gameService) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Validate player
      if (socket.data.playerId !== data.playerId) {
        socket.emit('error', { message: 'Invalid player' });
        return;
      }

      try {
        const gameState = gameService.stay(data.playerId);
        
        // Broadcast updated game state
        io.to(roomCode).emit('game:state', { gameState });

        // Handle AI players
        await processAITurns(io, roomCode, room.gameId, gameService);
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to stay' });
      }
    });

    // Handle player action: play action card
    socket.on('game:playActionCard', async (data: { playerId: string; cardId: string; targetPlayerId?: string }) => {
      const roomCode = socket.data.roomCode;
      const sessionId = socket.data.sessionId;

      if (!roomCode || !sessionId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = roomService.getRoom(roomCode);
      if (!room || !room.gameId) {
        socket.emit('error', { message: 'Game not started' });
        return;
      }

      const gameService = gameInstances.get(room.gameId);
      if (!gameService) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Validate player
      if (socket.data.playerId !== data.playerId) {
        socket.emit('error', { message: 'Invalid player' });
        return;
      }

      try {
        const gameState = gameService.playActionCard(data.playerId, data.cardId, data.targetPlayerId);
        
        // Broadcast updated game state
        io.to(roomCode).emit('game:state', { gameState });

        // Handle AI players
        await processAITurns(io, roomCode, room.gameId, gameService);
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to play action card' });
      }
    });

    // Handle next round
    socket.on('game:nextRound', async () => {
      const roomCode = socket.data.roomCode;
      const sessionId = socket.data.sessionId;

      if (!roomCode || !sessionId) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = roomService.getRoom(roomCode);
      if (!room || !room.gameId) {
        socket.emit('error', { message: 'Game not started' });
        return;
      }

      const gameService = gameInstances.get(room.gameId);
      if (!gameService) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Check if user is host
      const player = room.players.find(p => p.sessionId === sessionId);
      if (!player || !player.isHost) {
        socket.emit('error', { message: 'Only host can start next round' });
        return;
      }

      try {
        const gameState = gameService.startNextRound();
        
        // Broadcast updated game state
        io.to(roomCode).emit('game:state', { gameState });

        // Handle AI players
        await processAITurns(io, roomCode, room.gameId, gameService);
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to start next round' });
      }
    });

    // Handle get game state
    socket.on('game:getState', () => {
      const roomCode = socket.data.roomCode;

      if (!roomCode) {
        socket.emit('error', { message: 'Not in a room' });
        return;
      }

      const room = roomService.getRoom(roomCode);
      if (!room || !room.gameId) {
        socket.emit('error', { message: 'Game not started' });
        return;
      }

      const gameService = gameInstances.get(room.gameId);
      if (!gameService) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const gameState = gameService.getGameState();
      if (gameState) {
        socket.emit('game:state', { gameState });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const roomCode = socket.data.roomCode;
      const sessionId = socket.data.sessionId;

      if (roomCode && sessionId) {
        // Update connection status
        roomService.updatePlayerConnection(roomCode, sessionId, false);
        sessionService.updateConnectionStatus(sessionId, false);

        const room = roomService.getRoom(roomCode);
        if (room) {
          // Broadcast player disconnected
          io.to(roomCode).emit('player:disconnected', { sessionId, playerId: socket.data.playerId });
          io.to(roomCode).emit('room:updated', { room });
        }
      }
    });

    // Handle reconnection
    socket.on('reconnect', () => {
      const roomCode = socket.data.roomCode;
      const sessionId = socket.data.sessionId;

      if (roomCode && sessionId) {
        socket.join(roomCode);
        roomService.updatePlayerConnection(roomCode, sessionId, true);
        sessionService.updateConnectionStatus(sessionId, true);

        const room = roomService.getRoom(roomCode);
        if (room) {
          socket.emit('player:connected', { sessionId });
          io.to(roomCode).emit('room:updated', { room });

          // Send current game state if game is active
          if (room.gameId) {
            const gameService = gameInstances.get(room.gameId);
            if (gameService) {
              const gameState = gameService.getGameState();
              if (gameState) {
                socket.emit('game:state', { gameState });
              }
            }
          }
        }
      }
    });
  });
}

/**
 * Process AI player turns
 */
async function processAITurns(
  io: Server,
  roomCode: string,
  gameId: string,
  gameService: GameService
): Promise<void> {
  const gameState = gameService.getGameState();
  if (!gameState) return;

  // Wait a bit before processing AI
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check if current player is AI
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer || !currentPlayer.isAI || !currentPlayer.isActive || currentPlayer.hasBusted) {
    return;
  }

  // Get AI decision
  try {
    const decision = makeAIDecision(currentPlayer, gameState, currentPlayer.aiDifficulty || 'moderate');

    // Process decision
    if (decision.actionCard) {
      // Play action card
      const updatedState = gameService.playActionCard(
        currentPlayer.id,
        decision.actionCard.cardId,
        decision.actionCard.targetPlayerId
      );
      io.to(roomCode).emit('game:state', { gameState: updatedState });
      
      // Recursively process next AI turn if needed
      await processAITurns(io, roomCode, gameId, gameService);
    } else if (decision.action === 'hit') {
      const updatedState = gameService.hit(currentPlayer.id);
      io.to(roomCode).emit('game:state', { gameState: updatedState });
      
      // Recursively process next AI turn if needed
      await processAITurns(io, roomCode, gameId, gameService);
    } else if (decision.action === 'stay') {
      const updatedState = gameService.stay(currentPlayer.id);
      io.to(roomCode).emit('game:state', { gameState: updatedState });
      
      // Recursively process next AI turn if needed
      await processAITurns(io, roomCode, gameId, gameService);
    }
  } catch (error) {
    console.error('Error processing AI turn:', error);
  }
}

