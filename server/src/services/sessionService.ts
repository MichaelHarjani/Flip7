import type { PlayerSession } from '../../../shared/types/index.js';

/**
 * Service for managing player sessions
 * Maps sessionId -> playerId -> gameId
 */
export class SessionService {
  private sessions = new Map<string, PlayerSession>();
  private sessionToPlayerId = new Map<string, string>();
  private playerIdToSessionId = new Map<string, string>();
  private sessionToGameId = new Map<string, string>();

  /**
   * Create a new session
   */
  createSession(sessionId: string, playerId: string, name: string, isHost: boolean = false): PlayerSession {
    const session: PlayerSession = {
      sessionId,
      playerId,
      name,
      isHost,
      connected: true,
      lastSeen: new Date(),
    };

    this.sessions.set(sessionId, session);
    this.sessionToPlayerId.set(sessionId, playerId);
    this.playerIdToSessionId.set(playerId, sessionId);

    return session;
  }

  /**
   * Get session by sessionId
   */
  getSession(sessionId: string): PlayerSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get session by playerId
   */
  getSessionByPlayerId(playerId: string): PlayerSession | null {
    const sessionId = this.playerIdToSessionId.get(playerId);
    if (!sessionId) return null;
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get playerId from sessionId
   */
  getPlayerId(sessionId: string): string | null {
    return this.sessionToPlayerId.get(sessionId) || null;
  }

  /**
   * Get sessionId from playerId
   */
  getSessionId(playerId: string): string | null {
    return this.playerIdToSessionId.get(playerId) || null;
  }

  /**
   * Associate session with a game
   */
  setGameId(sessionId: string, gameId: string): void {
    this.sessionToGameId.set(sessionId, gameId);
  }

  /**
   * Get gameId for a session
   */
  getGameId(sessionId: string): string | null {
    return this.sessionToGameId.get(sessionId) || null;
  }

  /**
   * Get all sessions for a game
   */
  getSessionsForGame(gameId: string): PlayerSession[] {
    const sessions: PlayerSession[] = [];
    for (const [sessionId, gameIdForSession] of this.sessionToGameId.entries()) {
      if (gameIdForSession === gameId) {
        const session = this.sessions.get(sessionId);
        if (session) {
          sessions.push(session);
        }
      }
    }
    return sessions;
  }

  /**
   * Update session connection status
   */
  updateConnectionStatus(sessionId: string, connected: boolean): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.connected = connected;
      session.lastSeen = new Date();
    }
  }

  /**
   * Update session last seen
   */
  updateLastSeen(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastSeen = new Date();
    }
  }

  /**
   * Remove a session
   */
  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.sessions.delete(sessionId);
      this.sessionToPlayerId.delete(sessionId);
      this.playerIdToSessionId.delete(session.playerId);
      this.sessionToGameId.delete(sessionId);
    }
  }

  /**
   * Clean up disconnected sessions older than timeout
   */
  cleanupDisconnectedSessions(timeoutMs: number = 60000): void {
    const now = new Date();
    const toRemove: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (!session.connected) {
        const timeSinceLastSeen = now.getTime() - session.lastSeen.getTime();
        if (timeSinceLastSeen > timeoutMs) {
          toRemove.push(sessionId);
        }
      }
    }

    for (const sessionId of toRemove) {
      this.removeSession(sessionId);
    }
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): PlayerSession[] {
    return Array.from(this.sessions.values());
  }
}

// Singleton instance
export const sessionService = new SessionService();

