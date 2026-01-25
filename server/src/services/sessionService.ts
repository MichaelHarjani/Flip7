import type { PlayerSession } from '../shared/types/index.js';
import { supabase, isSupabaseAvailable } from '../config/supabase.js';

// Extended session type with optional user info
interface ExtendedPlayerSession extends PlayerSession {
  userId?: string; // Supabase user ID if authenticated
}

/**
 * Service for managing player sessions
 * Supports dual-mode: in-memory (guests) + database (authenticated)
 * Maps sessionId -> playerId -> gameId
 */
export class SessionService {
  private sessions = new Map<string, ExtendedPlayerSession>();
  private sessionToPlayerId = new Map<string, string>();
  private playerIdToSessionId = new Map<string, string>();
  private sessionToGameId = new Map<string, string>();

  /**
   * Create a new session
   */
  createSession(
    sessionId: string,
    playerId: string,
    name: string,
    isHost: boolean = false,
    userId?: string // Optional Supabase user ID
  ): ExtendedPlayerSession {
    const session: ExtendedPlayerSession = {
      sessionId,
      playerId,
      name,
      isHost,
      connected: true,
      lastSeen: new Date(),
      userId, // Store user ID if authenticated
    };

    this.sessions.set(sessionId, session);
    this.sessionToPlayerId.set(sessionId, playerId);
    this.playerIdToSessionId.set(playerId, sessionId);

    return session;
  }

  /**
   * Get session by sessionId
   */
  getSession(sessionId: string): ExtendedPlayerSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get session by playerId
   */
  getSessionByPlayerId(playerId: string): ExtendedPlayerSession | null {
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
  getSessionsForGame(gameId: string): ExtendedPlayerSession[] {
    const sessions: ExtendedPlayerSession[] = [];
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
   * Update session properties
   */
  updateSession(sessionId: string, updates: Partial<PlayerSession>): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, updates);
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
  getAllSessions(): ExtendedPlayerSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Check if session belongs to an authenticated user
   */
  isAuthenticatedSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return !!session?.userId;
  }

  /**
   * Persist session to database (for authenticated users only)
   */
  async persistSession(sessionId: string, roomCode?: string, gameId?: string): Promise<void> {
    if (!isSupabaseAvailable()) {
      return; // Silently skip if Supabase not configured
    }

    const session = this.sessions.get(sessionId);
    if (!session || !session.userId) {
      return; // Only persist authenticated sessions
    }

    try {
      const { error } = await supabase!
        .from('user_sessions')
        .upsert({
          session_id: sessionId,
          user_id: session.userId,
          player_id: session.playerId,
          player_name: session.name,
          room_code: roomCode || null,
          game_id: gameId || null,
          is_host: session.isHost,
          connected: session.connected,
          last_seen: session.lastSeen.toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        });

      if (error) {
        console.error('[SessionService] Failed to persist session:', error);
      }
    } catch (error) {
      console.error('[SessionService] Error persisting session:', error);
    }
  }

  /**
   * Load session from database
   */
  async loadSession(sessionId: string): Promise<ExtendedPlayerSession | null> {
    if (!isSupabaseAvailable()) {
      return null;
    }

    try {
      const { data, error } = await supabase!
        .from('user_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return null;
      }

      // Reconstruct session from database
      const session: ExtendedPlayerSession = {
        sessionId: data.session_id,
        playerId: data.player_id,
        name: data.player_name,
        isHost: data.is_host,
        connected: data.connected,
        lastSeen: new Date(data.last_seen),
        userId: data.user_id,
      };

      // Load into in-memory cache
      this.sessions.set(sessionId, session);
      this.sessionToPlayerId.set(sessionId, session.playerId);
      this.playerIdToSessionId.set(session.playerId, sessionId);

      if (data.game_id) {
        this.sessionToGameId.set(sessionId, data.game_id);
      }

      return session;
    } catch (error) {
      console.error('[SessionService] Error loading session:', error);
      return null;
    }
  }

  /**
   * Update session activity timestamp (for both in-memory and database)
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    // Update in-memory
    this.updateLastSeen(sessionId);

    // Update database if authenticated
    if (!this.isAuthenticatedSession(sessionId) || !isSupabaseAvailable()) {
      return;
    }

    try {
      const { error } = await supabase!
        .from('user_sessions')
        .update({
          last_seen: new Date().toISOString(),
          connected: true,
        })
        .eq('session_id', sessionId);

      if (error) {
        console.error('[SessionService] Failed to update session activity:', error);
      }
    } catch (error) {
      console.error('[SessionService] Error updating session activity:', error);
    }
  }
}

// Singleton instance
export const sessionService = new SessionService();

