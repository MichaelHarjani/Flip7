import type { GameState } from '../shared/types/index.js';

interface BufferedUpdate {
  timestamp: Date;
  gameState: GameState;
  event: string;
}

/**
 * Service for buffering game state updates to support reconnection
 */
export class GameStateBufferService {
  private buffers = new Map<string, BufferedUpdate[]>();
  private maxBufferSize = 50; // Keep last 50 updates
  private bufferTTL = 300000; // 5 minutes

  /**
   * Add a game state update to the buffer
   */
  addUpdate(gameId: string, gameState: GameState, event: string = 'game:state'): void {
    if (!this.buffers.has(gameId)) {
      this.buffers.set(gameId, []);
    }

    const buffer = this.buffers.get(gameId)!;
    buffer.push({
      timestamp: new Date(),
      gameState,
      event,
    });

    // Keep buffer size in check
    if (buffer.length > this.maxBufferSize) {
      buffer.shift(); // Remove oldest update
    }
  }

  /**
   * Get updates since a specific timestamp
   */
  getUpdatesSince(gameId: string, since: Date): BufferedUpdate[] {
    const buffer = this.buffers.get(gameId);
    if (!buffer) return [];

    return buffer.filter(update => update.timestamp > since);
  }

  /**
   * Get the latest game state for a game
   */
  getLatestState(gameId: string): GameState | null {
    const buffer = this.buffers.get(gameId);
    if (!buffer || buffer.length === 0) return null;

    return buffer[buffer.length - 1].gameState;
  }

  /**
   * Get all buffered updates for a game
   */
  getAllUpdates(gameId: string): BufferedUpdate[] {
    return this.buffers.get(gameId) || [];
  }

  /**
   * Clear buffer for a specific game
   */
  clearBuffer(gameId: string): void {
    this.buffers.delete(gameId);
  }

  /**
   * Clean up old buffers
   */
  cleanupOldBuffers(): void {
    const now = new Date();

    for (const [gameId, buffer] of this.buffers.entries()) {
      if (buffer.length === 0) {
        this.buffers.delete(gameId);
        continue;
      }

      // Remove updates older than TTL
      const validUpdates = buffer.filter(
        update => now.getTime() - update.timestamp.getTime() < this.bufferTTL
      );

      if (validUpdates.length === 0) {
        this.buffers.delete(gameId);
      } else {
        this.buffers.set(gameId, validUpdates);
      }
    }
  }
}

// Singleton instance
export const gameStateBufferService = new GameStateBufferService();
