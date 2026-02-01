-- Friends System Migration
-- Adds friends table with request/accept workflow

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  friend_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_user_id ON friends(friend_user_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

-- Enable Row Level Security
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own friend relationships
CREATE POLICY friends_select_policy ON friends
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

-- Policy: Users can insert friend requests they initiate
CREATE POLICY friends_insert_policy ON friends
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own friend requests (accept/block)
CREATE POLICY friends_update_policy ON friends
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

-- Policy: Users can delete their own friend relationships
CREATE POLICY friends_delete_policy ON friends
  FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

-- Add bio and avatar_id columns to user_profiles if they don't exist
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_id TEXT;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS friends_updated_at_trigger ON friends;
CREATE TRIGGER friends_updated_at_trigger
  BEFORE UPDATE ON friends
  FOR EACH ROW
  EXECUTE FUNCTION update_friends_updated_at();

-- Add online_status tracking to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();
