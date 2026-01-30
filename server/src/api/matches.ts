import { Router, Request, Response } from 'express';
import { recordMatch, getRecentMatches, getPlayerStats, getLeaderboard } from '../services/matchService';
import { getUserFromRequest } from '../middleware/authMiddleware';
import type { MatchResult, GameMode, MatchParticipant } from '../shared/types';

const router = Router();

/**
 * POST /api/matches
 * Record a completed match
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      gameId,
      gameMode,
      winnerId,
      winnerName,
      winnerScore,
      winnerUserId,
      totalRounds,
      targetScore,
      durationSeconds,
      participants,
      startedAt,
    } = req.body;

    // Validate required fields
    if (!gameId || !gameMode || !winnerId || !winnerName || winnerScore === undefined || !participants) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate game mode
    const validModes: GameMode[] = ['single', 'local', 'online', 'ranked'];
    if (!validModes.includes(gameMode)) {
      return res.status(400).json({ error: 'Invalid game mode' });
    }

    const match: MatchResult = {
      gameId,
      gameMode,
      winnerId,
      winnerName,
      winnerScore,
      winnerUserId: winnerUserId || null,
      totalRounds: totalRounds || 1,
      targetScore: targetScore || 200,
      durationSeconds: durationSeconds || null,
      participants: participants as MatchParticipant[],
      startedAt: startedAt ? new Date(startedAt) : undefined,
      completedAt: new Date(),
    };

    const result = await recordMatch(match);

    if (result.success) {
      res.json({ success: true, matchId: result.matchId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('[Matches API] Error recording match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matches/recent
 * Get recent matches for the authenticated user
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const result = await getRecentMatches(user.id, Math.min(limit, 50));

    res.json({ matches: result.matches });
  } catch (error) {
    console.error('[Matches API] Error fetching recent matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matches/stats
 * Get player stats for the authenticated user
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await getPlayerStats(user.id);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ stats: result.stats });
  } catch (error) {
    console.error('[Matches API] Error fetching player stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matches/stats/:userId
 * Get player stats for a specific user (public)
 */
router.get('/stats/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const result = await getPlayerStats(userId);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ stats: result.stats });
  } catch (error) {
    console.error('[Matches API] Error fetching player stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/matches/leaderboard
 * Get leaderboard
 */
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const metric = (req.query.metric as 'wins' | 'elo' | 'flip7s' | 'winStreak') || 'wins';
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await getLeaderboard(metric, Math.min(limit, 100));

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ leaderboard: result.leaderboard });
  } catch (error) {
    console.error('[Matches API] Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
