import { Router, Request, Response } from 'express';
import { verifyAuthToken } from '../middleware/authMiddleware.js';
import { supabase, isSupabaseAvailable } from '../config/supabase.js';
import {
  validateUsername,
  generateUsernameSuggestions,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
} from '../shared/utils/usernameValidation.js';

const router = Router();

/**
 * GET /api/username/check/:username
 * Check if a username is available
 */
router.get('/check/:username', async (req: Request, res: Response) => {
  if (!isSupabaseAvailable()) {
    return res.status(503).json({ error: 'Username service not available' });
  }

  const { username } = req.params;

  // Validate format first
  const validation = validateUsername(username);
  if (!validation.valid) {
    return res.json({
      available: false,
      error: validation.error,
    });
  }

  try {
    // Check if username exists in database (case-insensitive)
    const { data, error } = await supabase!
      .from('user_profiles')
      .select('username')
      .ilike('username', username)
      .maybeSingle();

    if (error) {
      console.error('[Username API] Error checking username:', error);
      return res.status(500).json({ error: 'Failed to check username' });
    }

    if (data) {
      // Username taken, generate suggestions
      const suggestions = generateUsernameSuggestions(username, 3);

      // Filter out taken suggestions
      const availableSuggestions: string[] = [];
      for (const suggestion of suggestions) {
        const { data: existing } = await supabase!
          .from('user_profiles')
          .select('username')
          .ilike('username', suggestion)
          .maybeSingle();

        if (!existing) {
          availableSuggestions.push(suggestion);
        }
      }

      return res.json({
        available: false,
        error: 'Username is already taken',
        suggestions: availableSuggestions,
      });
    }

    res.json({ available: true });

  } catch (error) {
    console.error('[Username API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/username/profile
 * Get the current user's profile (including username)
 */
router.get('/profile', async (req: Request, res: Response) => {
  if (!isSupabaseAvailable()) {
    return res.status(503).json({ error: 'Profile service not available' });
  }

  // Extract and verify auth token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.substring(7);
  const user = await verifyAuthToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    // Get user profile
    const { data: profile, error } = await supabase!
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[Username API] Error fetching profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    // Profile may not exist yet (new user)
    res.json({
      profile: profile || null,
      needsUsername: !profile,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url,
      },
    });

  } catch (error) {
    console.error('[Username API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/username/set
 * Set or update the username for the authenticated user
 */
router.post('/set', async (req: Request, res: Response) => {
  if (!isSupabaseAvailable()) {
    return res.status(503).json({ error: 'Username service not available' });
  }

  // Extract and verify auth token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.substring(7);
  const user = await verifyAuthToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { username } = req.body;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Validate username format
  const validation = validateUsername(username);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    // Check if username is already taken by someone else
    const { data: existing, error: checkError } = await supabase!
      .from('user_profiles')
      .select('id, username')
      .ilike('username', username)
      .maybeSingle();

    if (checkError) {
      console.error('[Username API] Error checking username:', checkError);
      return res.status(500).json({ error: 'Failed to check username' });
    }

    if (existing && existing.id !== user.id) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    // Check if user already has a profile
    const { data: currentProfile } = await supabase!
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (currentProfile) {
      // Update existing profile
      const { data: updatedProfile, error: updateError } = await supabase!
        .from('user_profiles')
        .update({ username: username.trim() })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Username API] Error updating username:', updateError);
        return res.status(500).json({ error: 'Failed to update username' });
      }

      console.log(`[Username API] Updated username for ${user.id}: ${username}`);
      return res.json({ profile: updatedProfile });
    } else {
      // Create new profile
      const { data: newProfile, error: insertError } = await supabase!
        .from('user_profiles')
        .insert({
          id: user.id,
          username: username.trim(),
          email: user.email || '',
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('[Username API] Error creating profile:', insertError);
        return res.status(500).json({ error: 'Failed to create profile' });
      }

      console.log(`[Username API] Created profile for ${user.id} with username: ${username}`);
      return res.json({ profile: newProfile });
    }

  } catch (error) {
    console.error('[Username API] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/username/constraints
 * Get username validation constraints (for client-side validation)
 */
router.get('/constraints', (_req: Request, res: Response) => {
  res.json({
    minLength: USERNAME_MIN_LENGTH,
    maxLength: USERNAME_MAX_LENGTH,
    pattern: '^[a-zA-Z][a-zA-Z0-9_]*$',
    rules: [
      `${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters`,
      'Letters, numbers, and underscores only',
      'Must start with a letter',
      'No inappropriate content',
    ],
  });
});

export default router;
