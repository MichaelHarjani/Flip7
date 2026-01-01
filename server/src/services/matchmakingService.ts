import type { MatchmakingQueueEntry } from '../shared/types/index.js';
import { roomService } from './roomService.js';
import { sessionService } from './sessionService.js';

/**
 * Service for matchmaking players
 */
export class MatchmakingService {
  private queue: MatchmakingQueueEntry[] = [];

  /**
   * Add player to matchmaking queue
   */
  addToQueue(playerName: string, maxPlayers: number = 4): { roomCode: string; sessionId: string; playerId: string } | null {
    // First, try to find an available room
    const availableRooms = roomService.getWaitingRooms(maxPlayers);
    
    for (const room of availableRooms) {
      if (room.players.length < room.maxPlayers && room.status === 'waiting') {
        // Join this room
        const result = roomService.joinRoom(room.roomCode, playerName);
        if (result) {
          return {
            roomCode: result.room.roomCode,
            sessionId: result.sessionId,
            playerId: result.playerId,
          };
        }
      }
    }

    // No available room, add to queue
    const sessionId = `queue-${Date.now()}-${Math.random()}`;
    const entry: MatchmakingQueueEntry = {
      sessionId,
      playerName,
      maxPlayers,
      joinedAt: new Date(),
    };

    this.queue.push(entry);

    // Try to match players in queue
    this.tryMatchPlayers();

    // If still in queue, create a new room
    const stillInQueue = this.queue.find(e => e.sessionId === sessionId);
    if (stillInQueue) {
      // Create a new room for this player
      const { room, sessionId: newSessionId, playerId } = roomService.createRoom(playerName, maxPlayers);
      this.removeFromQueue(sessionId); // Remove queue entry
      return {
        roomCode: room.roomCode,
        sessionId: newSessionId,
        playerId,
      };
    }

    return null;
  }

  /**
   * Remove player from queue
   */
  removeFromQueue(sessionId: string): void {
    const index = this.queue.findIndex(e => e.sessionId === sessionId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * Try to match players in queue
   */
  private tryMatchPlayers(): void {
    // Group by maxPlayers
    const groups = new Map<number, MatchmakingQueueEntry[]>();
    
    for (const entry of this.queue) {
      if (!groups.has(entry.maxPlayers)) {
        groups.set(entry.maxPlayers, []);
      }
      groups.get(entry.maxPlayers)!.push(entry);
    }

    // Try to match players in each group
    for (const [maxPlayers, entries] of groups.entries()) {
      if (entries.length >= 2) {
        // We have at least 2 players, create a room
        const firstEntry = entries[0];
        const secondEntry = entries[1];

        // Create room with first player as host
        const { room, sessionId: hostSessionId, playerId: hostPlayerId } = roomService.createRoom(
          firstEntry.playerName,
          maxPlayers
        );

        // Remove first player from queue
        this.removeFromQueue(firstEntry.sessionId);

        // Join second player
        try {
          const joinResult = roomService.joinRoom(room.roomCode, secondEntry.playerName);
          if (joinResult) {
            this.removeFromQueue(secondEntry.sessionId);
            
            // Try to fill remaining slots with other queued players
            const remainingSlots = maxPlayers - 2;
            for (let i = 0; i < remainingSlots && entries.length > 2; i++) {
              const nextEntry = entries[i + 2];
              if (nextEntry) {
                try {
                  roomService.joinRoom(room.roomCode, nextEntry.playerName);
                  this.removeFromQueue(nextEntry.sessionId);
                } catch (error) {
                  // Room might be full, continue
                  break;
                }
              }
            }
          }
        } catch (error) {
          // Failed to join, keep in queue
          console.error('Failed to join matched room:', error);
        }
      }
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(maxPlayers?: number): { count: number; estimatedWait: number } {
    const relevantQueue = maxPlayers
      ? this.queue.filter(e => e.maxPlayers === maxPlayers)
      : this.queue;

    return {
      count: relevantQueue.length,
      estimatedWait: relevantQueue.length > 0 ? relevantQueue.length * 5000 : 0, // Rough estimate
    };
  }

  /**
   * Clean up old queue entries (older than 5 minutes)
   */
  cleanupQueue(): void {
    const now = new Date();
    const fiveMinutesAgo = now.getTime() - 5 * 60 * 1000;

    this.queue = this.queue.filter(entry => {
      const entryTime = entry.joinedAt.getTime();
      if (entryTime < fiveMinutesAgo) {
        return false;
      }
      return true;
    });
  }
}

// Singleton instance
export const matchmakingService = new MatchmakingService();

