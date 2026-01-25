import type { Server, Socket } from 'socket.io';
import type { GameState } from '../shared/types/index.js';
import { roomService } from '../services/roomService.js';
import { sessionService } from '../services/sessionService.js';
import { matchmakingService } from '../services/matchmakingService.js';
import { GameService } from '../services/gameService.js';
import { makeAIDecision } from '../ai/aiPlayer.js';
import { gameStateBufferService } from '../services/gameStateBuffer.js';
import { extractUserFromSocket } from '../middleware/authMiddleware.js';

// Store game instances
const gameInstances = new Map<string, GameService>();

/**
 * Setup WebSocket event handlers
 */
export function setupWebSocketHandlers(io: Server): void {
  io.on('connection', async (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Extract and verify authentication token
    const user = await extractUserFromSocket(socket);
    socket.data.user = user;
    socket.data.isAuthenticated = !!user;

    if (user) {
      console.log(`[Auth] Authenticated connection: ${user.id} (${user.email})`);
    } else {
      console.log(`[Auth] Guest connection: ${socket.id}`);
    }

    // Handle ping/pong for heartbeat monitoring
    socket.on('ping', (data, callback) => {
      // Respond immediately to measure latency
      if (callback) callback({ timestamp: Date.now() });
      socket.emit('pong');
    });

    // Handle room creation
    socket.on('room:create', async (data: { playerName: string; maxPlayers?: number }) => {
      try {
        // Get userId if authenticated
        const userId = socket.data.user?.id;

        const { room, sessionId, playerId } = roomService.createRoom(
          data.playerName,
          data.maxPlayers || 4,
          userId
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

        if (userId) {
          console.log(`[Room Create] Authenticated user ${userId} created room ${room.roomCode}`);
        }
      } catch (error: any) {
        socket.emit('error', { message: error.message || 'Failed to create room' });
      }
    });

    // Handle room join
    socket.on('room:join', async (data: { roomCode: string; playerName: string }) => {
      try {
        // Get userId if authenticated
        const userId = socket.data.user?.id;

        const result = roomService.joinRoom(data.roomCode, data.playerName, userId);
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

        if (userId) {
          console.log(`[Room Join] Authenticated user ${userId} joined room ${data.roomCode}`);
        }
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

        // Buffer the game state for reconnection support
        gameStateBufferService.addUpdate(gameId, updatedGameState);

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

        // Buffer the game state
        if (room.gameId) {
          gameStateBufferService.addUpdate(room.gameId, gameState);
        }

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

        // Buffer the game state
        if (room.gameId) {
          gameStateBufferService.addUpdate(room.gameId, gameState);
        }

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

        // Buffer the game state
        if (room.gameId) {
          gameStateBufferService.addUpdate(room.gameId, gameState);
        }

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

        // Buffer the game state
        if (room.gameId) {
          gameStateBufferService.addUpdate(room.gameId, gameState);
        }

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
          const disconnectedPlayer = room.players.find(p => p.sessionId === sessionId);
          const wasHost = disconnectedPlayer?.isHost || false;

          console.log(`[Disconnect] Player ${sessionId} disconnected from room ${roomCode}, wasHost: ${wasHost}`);

          // If host disconnected and there are other connected players, migrate host
          if (wasHost && room.players.length > 1) {
            const connectedPlayers = room.players.filter(p => p.connected && p.sessionId !== sessionId);

            if (connectedPlayers.length > 0) {
              // Promote first connected player to host
              const newHost = connectedPlayers[0];
              console.log(`[Host Migration] Promoting ${newHost.name} (${newHost.sessionId}) to host`);

              roomService.migrateHost(roomCode, newHost.sessionId);
              const updatedRoom = roomService.getRoom(roomCode);

              if (updatedRoom) {
                // Notify all players about host migration
                io.to(roomCode).emit('host:migrated', {
                  newHostId: newHost.sessionId,
                  newHostName: newHost.name,
                  message: `${newHost.name} is now the host`
                });
                io.to(roomCode).emit('room:updated', { room: updatedRoom });
              }
            } else {
              console.log(`[Disconnect] No connected players to migrate host to, room will be cleaned up`);
            }
          }

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
        console.log(`[Reconnect] Player ${sessionId} reconnecting to room ${roomCode}`);

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
                console.log(`[Reconnect] Sending current game state to ${sessionId}`);
                socket.emit('game:state', { gameState });
              }
            }
          }
        }
      }
    });

    // Handle manual reconnection with session restoration
    socket.on('session:restore', async (data: { sessionId: string; roomCode: string }) => {
      console.log(`[Session Restore] Restoring session ${data.sessionId} in room ${data.roomCode}`);

      // Try to load room from database first (for authenticated hosts)
      let room = await roomService.loadRoom(data.roomCode);

      // Fallback to in-memory
      if (!room) {
        room = roomService.getRoom(data.roomCode);
      }

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Try to load session from database (for authenticated users)
      let player = await sessionService.loadSession(data.sessionId);

      // Fallback to in-memory room players
      if (!player) {
        const foundPlayer = room.players.find(p => p.sessionId === data.sessionId);
        if (foundPlayer) {
          player = foundPlayer;
        }
      }

      if (!player) {
        socket.emit('error', { message: 'Session not found in room' });
        return;
      }

      // Restore socket data
      socket.join(data.roomCode);
      socket.data.sessionId = data.sessionId;
      socket.data.playerId = player.playerId;
      socket.data.roomCode = data.roomCode;

      // Update connection status
      roomService.updatePlayerConnection(data.roomCode, data.sessionId, true);
      sessionService.updateConnectionStatus(data.sessionId, true);

      // Update last_seen for authenticated sessions
      if (socket.data.isAuthenticated) {
        await sessionService.updateSessionActivity(data.sessionId).catch(err => {
          console.error('[Session Restore] Failed to update session activity:', err);
        });
      }

      // Send room state
      socket.emit('room:joined', {
        room,
        sessionId: data.sessionId,
        playerId: player.playerId,
      });

      // Broadcast reconnection
      io.to(data.roomCode).emit('player:connected', { sessionId: data.sessionId });
      io.to(data.roomCode).emit('room:updated', { room });

      // Send buffered game state if game is active
      if (room.gameId) {
        const latestState = gameStateBufferService.getLatestState(room.gameId);
        if (latestState) {
          console.log(`[Session Restore] Sending buffered game state to ${data.sessionId}`);
          socket.emit('game:state', { gameState: latestState });
        }
      }

      console.log(`[Session Restore] Successfully restored session ${data.sessionId} in room ${data.roomCode}`);
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
      gameStateBufferService.addUpdate(gameId, updatedState);
      io.to(roomCode).emit('game:state', { gameState: updatedState });

      // Recursively process next AI turn if needed
      await processAITurns(io, roomCode, gameId, gameService);
    } else if (decision.action === 'hit') {
      const updatedState = gameService.hit(currentPlayer.id);
      gameStateBufferService.addUpdate(gameId, updatedState);
      io.to(roomCode).emit('game:state', { gameState: updatedState });

      // Recursively process next AI turn if needed
      await processAITurns(io, roomCode, gameId, gameService);
    } else if (decision.action === 'stay') {
      const updatedState = gameService.stay(currentPlayer.id);
      gameStateBufferService.addUpdate(gameId, updatedState);
      io.to(roomCode).emit('game:state', { gameState: updatedState });

      // Recursively process next AI turn if needed
      await processAITurns(io, roomCode, gameId, gameService);
    }
  } catch (error) {
    console.error('Error processing AI turn:', error);
  }
}

