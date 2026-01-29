import { Router, Request, Response } from 'express';
import { verifyAuthToken } from '../middleware/authMiddleware.js';
import { supabase, isSupabaseAvailable } from '../config/supabase.js';

const router = Router();

/**
 * GET /api/sessions/active
 * Returns active sessions for the authenticated user
 * Used to show "Rejoin Game" dialog when user reopens the app
 */
router.get('/active', async (req: Request, res: Response) => {
  // Check if Supabase is available
  if (!isSupabaseAvailable()) {
    return res.json({ sessions: [] });
  }

  // Extract and verify auth token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const user = await verifyAuthToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    // Query active sessions for this user
    const { data: sessions, error } = await supabase!
      .from('user_sessions')
      .select(`
        session_id,
        player_id,
        player_name,
        room_code,
        game_id,
        is_host,
        connected,
        last_seen,
        expires_at
      `)
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString())
      .order('last_seen', { ascending: false });

    if (error) {
      console.error('[Sessions API] Error fetching sessions:', error);
      return res.status(500).json({ error: 'Failed to fetch sessions' });
    }

    // Filter to only sessions with active rooms
    const activeSessions = [];

    for (const session of sessions || []) {
      if (session.room_code) {
        // Check if room still exists and is active
        const { data: room, error: roomError } = await supabase!
          .from('rooms')
          .select('room_code, status, game_id')
          .eq('room_code', session.room_code)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (!roomError && room && room.status !== 'ended') {
          activeSessions.push({
            sessionId: session.session_id,
            playerId: session.player_id,
            playerName: session.player_name,
            roomCode: session.room_code,
            gameId: session.game_id || room.game_id,
            isHost: session.is_host,
            connected: session.connected,
            lastSeen: session.last_seen,
            roomStatus: room.status,
          });
        }
      }
    }

    console.log(`[Sessions API] Found ${activeSessions.length} active sessions for user ${user.id}`);
    res.json({ sessions: activeSessions });

  } catch (error) {
    console.error('[Sessions API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/sessions/:sessionId
 * Removes a specific session (used when user chooses not to rejoin)
 */
router.delete('/:sessionId', async (req: Request, res: Response) => {
  if (!isSupabaseAvailable()) {
    return res.status(503).json({ error: 'Session management not available' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.substring(7);
  const user = await verifyAuthToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { sessionId } = req.params;

  try {
    // Only allow users to delete their own sessions
    const { error } = await supabase!
      .from('user_sessions')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Sessions API] Error deleting session:', error);
      return res.status(500).json({ error: 'Failed to delete session' });
    }

    console.log(`[Sessions API] Deleted session ${sessionId} for user ${user.id}`);
    res.json({ success: true });

  } catch (error) {
    console.error('[Sessions API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
