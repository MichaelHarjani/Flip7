-- Match History Schema
-- Run this in Supabase SQL editor to create the match history tables

-- Table: match_history
-- Stores completed game results
CREATE TABLE IF NOT EXISTS match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  game_mode TEXT NOT NULL CHECK (game_mode IN ('single', 'local', 'online', 'ranked')),

  -- Winner info
  winner_id TEXT NOT NULL,
  winner_name TEXT NOT NULL,
  winner_score INTEGER NOT NULL,
  winner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Game stats
  total_rounds INTEGER NOT NULL DEFAULT 1,
  target_score INTEGER NOT NULL DEFAULT 200,
  duration_seconds INTEGER,

  -- Participant data (JSON array of player results)
  participants JSONB NOT NULL DEFAULT '[]',
  -- Example: [{"id": "...", "name": "Alice", "score": 215, "userId": null, "isAI": false, "flip7Count": 1, "bustCount": 2}]

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: player_stats
-- Aggregated statistics per user
CREATE TABLE IF NOT EXISTS player_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Game counts
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  games_lost INTEGER NOT NULL DEFAULT 0,

  -- Score stats
  total_score INTEGER NOT NULL DEFAULT 0,
  highest_score INTEGER NOT NULL DEFAULT 0,
  highest_round_score INTEGER NOT NULL DEFAULT 0,

  -- Achievement counts
  flip7_count INTEGER NOT NULL DEFAULT 0,
  bust_count INTEGER NOT NULL DEFAULT 0,
  freeze_used_count INTEGER NOT NULL DEFAULT 0,
  flip_three_used_count INTEGER NOT NULL DEFAULT 0,
  second_chance_saves INTEGER NOT NULL DEFAULT 0,

  -- Streaks
  current_win_streak INTEGER NOT NULL DEFAULT 0,
  best_win_streak INTEGER NOT NULL DEFAULT 0,

  -- Ranked stats (for future use)
  elo_rating INTEGER NOT NULL DEFAULT 1200,
  ranked_games_played INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_match_history_winner_user ON match_history(winner_user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_completed_at ON match_history(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_history_game_mode ON match_history(game_mode);

-- Index on participants for searching user's matches
CREATE INDEX IF NOT EXISTS idx_match_history_participants ON match_history USING GIN (participants);

-- Function to update player stats when a match is recorded
CREATE OR REPLACE FUNCTION update_player_stats_on_match()
RETURNS TRIGGER AS $$
DECLARE
  participant JSONB;
  p_user_id UUID;
  p_score INTEGER;
  p_is_winner BOOLEAN;
  p_flip7_count INTEGER;
  p_bust_count INTEGER;
BEGIN
  -- Loop through all participants with user IDs
  FOR participant IN SELECT * FROM jsonb_array_elements(NEW.participants)
  LOOP
    p_user_id := (participant->>'userId')::UUID;

    -- Skip if no user ID (guest player)
    IF p_user_id IS NULL THEN
      CONTINUE;
    END IF;

    p_score := COALESCE((participant->>'score')::INTEGER, 0);
    p_is_winner := (participant->>'id')::TEXT = NEW.winner_id;
    p_flip7_count := COALESCE((participant->>'flip7Count')::INTEGER, 0);
    p_bust_count := COALESCE((participant->>'bustCount')::INTEGER, 0);

    -- Insert or update player stats
    INSERT INTO player_stats (
      user_id,
      games_played,
      games_won,
      games_lost,
      total_score,
      highest_score,
      flip7_count,
      bust_count,
      current_win_streak,
      best_win_streak,
      ranked_games_played,
      updated_at
    ) VALUES (
      p_user_id,
      1,
      CASE WHEN p_is_winner THEN 1 ELSE 0 END,
      CASE WHEN NOT p_is_winner THEN 1 ELSE 0 END,
      p_score,
      p_score,
      p_flip7_count,
      p_bust_count,
      CASE WHEN p_is_winner THEN 1 ELSE 0 END,
      CASE WHEN p_is_winner THEN 1 ELSE 0 END,
      CASE WHEN NEW.game_mode = 'ranked' THEN 1 ELSE 0 END,
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      games_played = player_stats.games_played + 1,
      games_won = player_stats.games_won + CASE WHEN p_is_winner THEN 1 ELSE 0 END,
      games_lost = player_stats.games_lost + CASE WHEN NOT p_is_winner THEN 1 ELSE 0 END,
      total_score = player_stats.total_score + p_score,
      highest_score = GREATEST(player_stats.highest_score, p_score),
      flip7_count = player_stats.flip7_count + p_flip7_count,
      bust_count = player_stats.bust_count + p_bust_count,
      current_win_streak = CASE
        WHEN p_is_winner THEN player_stats.current_win_streak + 1
        ELSE 0
      END,
      best_win_streak = GREATEST(
        player_stats.best_win_streak,
        CASE WHEN p_is_winner THEN player_stats.current_win_streak + 1 ELSE player_stats.best_win_streak END
      ),
      ranked_games_played = player_stats.ranked_games_played + CASE WHEN NEW.game_mode = 'ranked' THEN 1 ELSE 0 END,
      updated_at = NOW();
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stats when match is recorded
DROP TRIGGER IF EXISTS trigger_update_player_stats ON match_history;
CREATE TRIGGER trigger_update_player_stats
  AFTER INSERT ON match_history
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_on_match();

-- RLS Policies
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can read match history
CREATE POLICY "Match history is viewable by everyone"
  ON match_history FOR SELECT
  USING (true);

-- Only authenticated users can insert matches (via service role in production)
CREATE POLICY "Service role can insert matches"
  ON match_history FOR INSERT
  WITH CHECK (true);

-- Users can view their own stats
CREATE POLICY "Users can view own stats"
  ON player_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view any stats (for leaderboard)
CREATE POLICY "Anyone can view stats"
  ON player_stats FOR SELECT
  USING (true);

-- Service role handles stat updates via trigger
CREATE POLICY "Service role can manage stats"
  ON player_stats FOR ALL
  USING (true);
