-- Achievements and XP/Level System
-- Run this in Supabase SQL editor after 001_match_history.sql

-- Add XP and level columns to player_stats
ALTER TABLE player_stats
ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_login_date DATE,
ADD COLUMN IF NOT EXISTS login_streak INTEGER NOT NULL DEFAULT 0;

-- Table: user_achievements
-- Tracks which achievements users have unlocked
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,  -- e.g., 'wins', 'flip7', 'games'
  tier_id TEXT NOT NULL,         -- e.g., 'wins_1', 'wins_10', 'flip7_5'
  progress INTEGER NOT NULL DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Prevent duplicate unlocks
  UNIQUE(user_id, tier_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);

-- RLS Policies
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view anyone's achievements (for profiles)
CREATE POLICY "Anyone can view achievements"
  ON user_achievements FOR SELECT
  USING (true);

-- Service role can insert/update achievements
CREATE POLICY "Service role can manage achievements"
  ON user_achievements FOR ALL
  USING (true);

-- Function to award XP and check level up
CREATE OR REPLACE FUNCTION award_xp(p_user_id UUID, p_xp_amount INTEGER)
RETURNS TABLE(new_xp INTEGER, new_level INTEGER, leveled_up BOOLEAN) AS $$
DECLARE
  current_xp INTEGER;
  current_level INTEGER;
  calculated_level INTEGER;
  xp_thresholds INTEGER[] := ARRAY[0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250, 3850, 4500, 5200, 6000, 6900, 7900, 9000, 10200, 11500, 13000, 14700, 16600, 18700, 21000];
  i INTEGER;
BEGIN
  -- Get current XP and level
  SELECT xp, level INTO current_xp, current_level
  FROM player_stats
  WHERE user_id = p_user_id;

  -- If user doesn't exist, create with initial XP
  IF current_xp IS NULL THEN
    current_xp := 0;
    current_level := 1;
  END IF;

  -- Add XP
  new_xp := current_xp + p_xp_amount;

  -- Calculate new level
  calculated_level := 1;
  FOR i IN REVERSE array_length(xp_thresholds, 1)..1 LOOP
    IF new_xp >= xp_thresholds[i] THEN
      calculated_level := i;
      EXIT;
    END IF;
  END LOOP;

  -- Handle levels beyond 25 (each needs +2500 more)
  IF new_xp >= xp_thresholds[array_length(xp_thresholds, 1)] THEN
    calculated_level := 25 + ((new_xp - xp_thresholds[array_length(xp_thresholds, 1)]) / 2500);
  END IF;

  new_level := calculated_level;
  leveled_up := calculated_level > current_level;

  -- Update player stats
  UPDATE player_stats
  SET xp = new_xp, level = new_level, updated_at = NOW()
  WHERE user_id = p_user_id;

  -- If no row was updated, insert new one
  IF NOT FOUND THEN
    INSERT INTO player_stats (user_id, xp, level)
    VALUES (p_user_id, new_xp, new_level);
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to unlock an achievement
CREATE OR REPLACE FUNCTION unlock_achievement(p_user_id UUID, p_achievement_id TEXT, p_tier_id TEXT, p_progress INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_achievements (user_id, achievement_id, tier_id, progress)
  VALUES (p_user_id, p_achievement_id, p_tier_id, p_progress)
  ON CONFLICT (user_id, tier_id) DO NOTHING;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's achievement summary
CREATE OR REPLACE FUNCTION get_user_achievements(p_user_id UUID)
RETURNS TABLE(
  achievement_id TEXT,
  tier_id TEXT,
  progress INTEGER,
  unlocked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT ua.achievement_id, ua.tier_id, ua.progress, ua.unlocked_at
  FROM user_achievements ua
  WHERE ua.user_id = p_user_id
  ORDER BY ua.unlocked_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Update the match trigger to also award XP
CREATE OR REPLACE FUNCTION update_player_stats_on_match()
RETURNS TRIGGER AS $$
DECLARE
  participant JSONB;
  p_user_id UUID;
  p_score INTEGER;
  p_is_winner BOOLEAN;
  p_flip7_count INTEGER;
  p_bust_count INTEGER;
  p_win_streak INTEGER;
  xp_earned INTEGER;
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

    -- Get current win streak for XP calculation
    SELECT current_win_streak INTO p_win_streak
    FROM player_stats
    WHERE user_id = p_user_id;

    p_win_streak := COALESCE(p_win_streak, 0);

    -- Calculate XP earned
    xp_earned := 25; -- Base XP for playing
    IF p_is_winner THEN
      xp_earned := xp_earned + 50; -- Win bonus
      xp_earned := xp_earned + LEAST(p_win_streak + 1, 10) * 10; -- Streak bonus (capped)
    END IF;
    xp_earned := xp_earned + p_flip7_count * 30; -- Flip 7 bonus

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
      xp,
      level,
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
      xp_earned,
      1,
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
      xp = player_stats.xp + xp_earned,
      level = GREATEST(1, (
        SELECT CASE
          WHEN player_stats.xp + xp_earned >= 21000 THEN 25 + ((player_stats.xp + xp_earned - 21000) / 2500)
          WHEN player_stats.xp + xp_earned >= 18700 THEN 24
          WHEN player_stats.xp + xp_earned >= 16600 THEN 23
          WHEN player_stats.xp + xp_earned >= 14700 THEN 22
          WHEN player_stats.xp + xp_earned >= 13000 THEN 21
          WHEN player_stats.xp + xp_earned >= 11500 THEN 20
          WHEN player_stats.xp + xp_earned >= 10200 THEN 19
          WHEN player_stats.xp + xp_earned >= 9000 THEN 18
          WHEN player_stats.xp + xp_earned >= 7900 THEN 17
          WHEN player_stats.xp + xp_earned >= 6900 THEN 16
          WHEN player_stats.xp + xp_earned >= 6000 THEN 15
          WHEN player_stats.xp + xp_earned >= 5200 THEN 14
          WHEN player_stats.xp + xp_earned >= 4500 THEN 13
          WHEN player_stats.xp + xp_earned >= 3850 THEN 12
          WHEN player_stats.xp + xp_earned >= 3250 THEN 11
          WHEN player_stats.xp + xp_earned >= 2700 THEN 10
          WHEN player_stats.xp + xp_earned >= 2200 THEN 9
          WHEN player_stats.xp + xp_earned >= 1750 THEN 8
          WHEN player_stats.xp + xp_earned >= 1350 THEN 7
          WHEN player_stats.xp + xp_earned >= 1000 THEN 6
          WHEN player_stats.xp + xp_earned >= 700 THEN 5
          WHEN player_stats.xp + xp_earned >= 450 THEN 4
          WHEN player_stats.xp + xp_earned >= 250 THEN 3
          WHEN player_stats.xp + xp_earned >= 100 THEN 2
          ELSE 1
        END
      )),
      updated_at = NOW();
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger with updated function
DROP TRIGGER IF EXISTS trigger_update_player_stats ON match_history;
CREATE TRIGGER trigger_update_player_stats
  AFTER INSERT ON match_history
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_on_match();
