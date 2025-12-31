// Shared game state storage for serverless functions
// Note: This uses in-memory storage. Games will reset on cold starts.
// For production, consider using a database (Redis, MongoDB, etc.)

import { GameService } from '../../server/src/services/gameService.js';
import type { GameState } from '../../shared/types/index.js';

// Store game instances in memory
// In a production environment, this should be replaced with a database
const gameInstances = new Map<string, GameService>();

export function getGameService(gameId: string): GameService | undefined {
  return gameInstances.get(gameId);
}

export function setGameService(gameId: string, gameService: GameService): void {
  gameInstances.set(gameId, gameService);
}

export function createGameService(): GameService {
  return new GameService();
}

