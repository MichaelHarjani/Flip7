import { supabase } from '../config/supabase';
import type { MatchResult, PlayerStats, RecentMatch, MatchParticipant, GameMode } from '../shared/types';

/**
 * Service for managing match history and player statistics
 */

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  return !!supabase;
};

/**
 * Record a completed match to the database
 */
export async function recordMatch(match: MatchResult): Promise<{ success: boolean; matchId?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    console.log('[MatchService] Supabase not configured, skipping match recording');
    return { success: false, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase!
      .from('match_history')
      .insert({
        game_id: match.gameId,
        game_mode: match.gameMode,
        winner_id: match.winnerId,
        winner_name: match.winnerName,
        winner_score: match.winnerScore,
        winner_user_id: match.winnerUserId || null,
        total_rounds: match.totalRounds,
        target_score: match.targetScore,
        duration_seconds: match.durationSeconds || null,
        participants: match.participants,
        started_at: match.startedAt?.toISOString() || null,
        completed_at: match.completedAt.toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[MatchService] Error recording match:', error);
      return { success: false, error: error.message };
    }

    console.log('[MatchService] Match recorded successfully:', data.id);
    return { success: true, matchId: data.id };
  } catch (err) {
    console.error('[MatchService] Exception recording match:', err);
    return { success: false, error: 'Failed to record match' };
  }
}

/**
 * Get recent matches for a user
 */
export async function getRecentMatches(
  userId: string,
  limit: number = 10
): Promise<{ matches: RecentMatch[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { matches: [], error: 'Database not configured' };
  }

  try {
    // Query matches where the user is a participant
    const { data, error } = await supabase!
      .from('match_history')
      .select('*')
      .contains('participants', [{ userId }])
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[MatchService] Error fetching recent matches:', error);
      return { matches: [], error: error.message };
    }

    // Transform to RecentMatch format
    const matches: RecentMatch[] = (data || []).map((row: any) => {
      const participants = row.participants as MatchParticipant[];
      const userParticipant = participants.find(p => p.userId === userId);
      const opponent = participants.find(p => p.userId !== userId && !p.isAI)
        || participants.find(p => p.id !== userParticipant?.id);

      return {
        id: row.id,
        gameMode: row.game_mode as GameMode,
        isWin: row.winner_id === userParticipant?.id,
        playerScore: userParticipant?.score || 0,
        opponentName: opponent?.name || 'Unknown',
        opponentScore: opponent?.score || 0,
        flip7Achieved: (userParticipant?.flip7Count || 0) > 0,
        completedAt: new Date(row.completed_at),
      };
    });

    return { matches };
  } catch (err) {
    console.error('[MatchService] Exception fetching recent matches:', err);
    return { matches: [], error: 'Failed to fetch matches' };
  }
}

/**
 * Get player stats for a user
 */
export async function getPlayerStats(userId: string): Promise<{ stats: PlayerStats | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { stats: null, error: 'Database not configured' };
  }

  try {
    const { data, error } = await supabase!
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No stats found - return default stats
        return {
          stats: {
            userId,
            gamesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            totalScore: 0,
            highestScore: 0,
            highestRoundScore: 0,
            flip7Count: 0,
            bustCount: 0,
            freezeUsedCount: 0,
            flipThreeUsedCount: 0,
            secondChanceSaves: 0,
            currentWinStreak: 0,
            bestWinStreak: 0,
            eloRating: 1200,
            rankedGamesPlayed: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        };
      }
      console.error('[MatchService] Error fetching player stats:', error);
      return { stats: null, error: error.message };
    }

    // Transform from snake_case to camelCase
    const stats: PlayerStats = {
      userId: data.user_id,
      gamesPlayed: data.games_played,
      gamesWon: data.games_won,
      gamesLost: data.games_lost,
      totalScore: data.total_score,
      highestScore: data.highest_score,
      highestRoundScore: data.highest_round_score,
      flip7Count: data.flip7_count,
      bustCount: data.bust_count,
      freezeUsedCount: data.freeze_used_count,
      flipThreeUsedCount: data.flip_three_used_count,
      secondChanceSaves: data.second_chance_saves,
      currentWinStreak: data.current_win_streak,
      bestWinStreak: data.best_win_streak,
      eloRating: data.elo_rating,
      rankedGamesPlayed: data.ranked_games_played,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };

    return { stats };
  } catch (err) {
    console.error('[MatchService] Exception fetching player stats:', err);
    return { stats: null, error: 'Failed to fetch stats' };
  }
}

/**
 * Get leaderboard (top players by various metrics)
 */
export async function getLeaderboard(
  metric: 'wins' | 'elo' | 'flip7s' | 'winStreak' = 'wins',
  limit: number = 10
): Promise<{ leaderboard: Array<{ userId: string; username: string; value: number }>; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { leaderboard: [], error: 'Database not configured' };
  }

  try {
    const columnMap = {
      wins: 'games_won',
      elo: 'elo_rating',
      flip7s: 'flip7_count',
      winStreak: 'best_win_streak',
    };

    const { data, error } = await supabase!
      .from('player_stats')
      .select(`
        user_id,
        ${columnMap[metric]},
        user_profiles!inner(username)
      `)
      .order(columnMap[metric], { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[MatchService] Error fetching leaderboard:', error);
      return { leaderboard: [], error: error.message };
    }

    const leaderboard = (data || []).map((row: any) => ({
      userId: row.user_id,
      username: row.user_profiles?.username || 'Unknown',
      value: row[columnMap[metric]],
    }));

    return { leaderboard };
  } catch (err) {
    console.error('[MatchService] Exception fetching leaderboard:', err);
    return { leaderboard: [], error: 'Failed to fetch leaderboard' };
  }
}
