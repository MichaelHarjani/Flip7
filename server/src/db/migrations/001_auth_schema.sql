-- Flip 7 Authentication and Persistent Sessions Schema
-- This migration creates tables for user authentication and session persistence

-- =====================================================
-- 1. USER PROFILES
-- =====================================================
-- Extends Supabase auth.users with additional profile information
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON public.user_profiles(username);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read all profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.user_profiles FOR SELECT
  USING (true);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- 2. USER SESSIONS (Authenticated Sessions Only)
-- =====================================================
-- Stores persistent session data for authenticated users
CREATE TABLE IF NOT EXISTS public.user_sessions (
  session_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  room_code TEXT,
  game_id TEXT,
  is_host BOOLEAN NOT NULL DEFAULT false,
  connected BOOLEAN NOT NULL DEFAULT true,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_room_code ON public.user_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON public.user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_connected ON public.user_sessions(connected, expires_at);

-- Enable Row Level Security
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can do everything (for server operations)
CREATE POLICY "Service role has full access to sessions"
  ON public.user_sessions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- 3. ROOMS (Persistent Rooms for Authenticated Hosts)
-- =====================================================
-- Stores room data when the host is authenticated
CREATE TYPE room_status AS ENUM ('waiting', 'playing', 'ended');

CREATE TABLE IF NOT EXISTS public.rooms (
  room_code TEXT PRIMARY KEY,
  game_id TEXT,
  host_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  max_players INTEGER NOT NULL DEFAULT 4,
  status room_status NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_host_user_id ON public.rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON public.rooms(expires_at);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view active rooms (for joining)
CREATE POLICY "Anyone can view active rooms"
  ON public.rooms FOR SELECT
  USING (expires_at > NOW());

-- RLS Policy: Service role can do everything
CREATE POLICY "Service role has full access to rooms"
  ON public.rooms FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- 4. ROOM PARTICIPANTS
-- =====================================================
-- Links users (or guests) to rooms they've joined
CREATE TABLE IF NOT EXISTS public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES public.rooms(room_code) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_room_participants_room_code ON public.room_participants(room_code);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON public.room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_session_id ON public.room_participants(session_id);

-- Enable Row Level Security
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view participants of active rooms
CREATE POLICY "Anyone can view room participants"
  ON public.room_participants FOR SELECT
  USING (true);

-- RLS Policy: Service role can do everything
CREATE POLICY "Service role has full access to room participants"
  ON public.room_participants FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- 5. GAME HISTORY (Future: Stats and Leaderboards)
-- =====================================================
-- Records completed games for stats tracking
CREATE TABLE IF NOT EXISTS public.game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL,
  room_code TEXT NOT NULL,
  winner_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  player_count INTEGER NOT NULL,
  rounds_played INTEGER NOT NULL,
  final_scores JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_history_winner_user_id ON public.game_history(winner_user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON public.game_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view game history
CREATE POLICY "Game history is viewable by everyone"
  ON public.game_history FOR SELECT
  USING (true);

-- RLS Policy: Service role can insert game history
CREATE POLICY "Service role can insert game history"
  ON public.game_history FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to automatically update updated_at on user_profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to clean up expired sessions (called by server periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired rooms (called by server periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rooms
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.user_profiles IS 'Extended user profile information for authenticated users';
COMMENT ON TABLE public.user_sessions IS 'Persistent session data for authenticated users, allows rejoining games';
COMMENT ON TABLE public.rooms IS 'Persistent rooms created by authenticated hosts';
COMMENT ON TABLE public.room_participants IS 'Links users (authenticated or guest) to rooms';
COMMENT ON TABLE public.game_history IS 'Historical record of completed games for stats and leaderboards';

COMMENT ON FUNCTION cleanup_expired_sessions() IS 'Removes sessions that have expired (called by server cleanup job)';
COMMENT ON FUNCTION cleanup_expired_rooms() IS 'Removes rooms that have expired (called by server cleanup job)';
