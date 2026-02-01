import { Router } from 'express';
import { supabase, isSupabaseAvailable } from '../config/supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * GET /api/profile/:userId - Get a user's public profile
 */
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!isSupabaseAvailable() || !supabase) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, username, avatar_url, avatar_id, bio, created_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get user stats
    const { data: stats, error: statsError } = await supabase
      .from('player_stats')
      .select('games_played, games_won, highest_score, flip7_count, current_win_streak, best_win_streak')
      .eq('user_id', userId)
      .single();

    res.json({
      id: profile.id,
      username: profile.username,
      avatarId: profile.avatar_id,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      createdAt: profile.created_at,
      stats: stats ? {
        gamesPlayed: stats.games_played,
        gamesWon: stats.games_won,
        highestScore: stats.highest_score,
        flip7Count: stats.flip7_count,
        currentWinStreak: stats.current_win_streak,
        bestWinStreak: stats.best_win_streak,
      } : null,
    });
  } catch (error) {
    console.error('[Profile] Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/profile - Get current user's profile
 */
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;

  if (!isSupabaseAvailable() || !supabase) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('[Profile] Error fetching own profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PUT /api/profile - Update current user's profile
 */
router.put('/', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { username, bio, avatar_id } = req.body;

  if (!isSupabaseAvailable() || !supabase) {
    return res.status(503).json({ error: 'Database not available' });
  }

  // Validate username if provided
  if (username !== undefined) {
    if (typeof username !== 'string' || username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 2-20 characters' });
    }

    // Check username is alphanumeric with underscores/hyphens
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' });
    }

    // Check username uniqueness
    const { data: existingUser, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .neq('id', userId)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }
  }

  // Validate bio if provided
  if (bio !== undefined && typeof bio === 'string' && bio.length > 100) {
    return res.status(400).json({ error: 'Bio must be 100 characters or less' });
  }

  try {
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (username !== undefined) updates.username = username;
    if (bio !== undefined) updates.bio = bio || null;
    if (avatar_id !== undefined) updates.avatar_id = avatar_id || null;

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[Profile] Error updating profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('[Profile] Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/profile/search?username=xxx - Search users by username
 */
router.get('/search', async (req, res) => {
  const { username } = req.query;

  if (!username || typeof username !== 'string' || username.length < 2) {
    return res.status(400).json({ error: 'Username query must be at least 2 characters' });
  }

  if (!isSupabaseAvailable() || !supabase) {
    return res.status(503).json({ error: 'Database not available' });
  }

  try {
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, username, avatar_url, avatar_id')
      .ilike('username', `%${username}%`)
      .limit(10);

    if (error) {
      console.error('[Profile] Error searching users:', error);
      return res.status(500).json({ error: 'Failed to search users' });
    }

    res.json({ users: users || [] });
  } catch (error) {
    console.error('[Profile] Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

export default router;
