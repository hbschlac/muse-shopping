-- Migration: Add User Influencer Follows Table
-- Date: 2026-02-03
-- Purpose: Track which influencers users follow for style profile system
-- Note: fashion_influencers table already exists with style metadata from migration 022
-- Note: style_profile_events table already exists from migration 022

-- Add missing columns to fashion_influencers if they don't exist
ALTER TABLE fashion_influencers
  ADD COLUMN IF NOT EXISTS audience_life_stage VARCHAR(50),
  ADD COLUMN IF NOT EXISTS follower_count INTEGER;

-- User Influencer Follows (track which influencers users follow)
CREATE TABLE IF NOT EXISTS user_influencer_follows (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  influencer_id INTEGER NOT NULL REFERENCES fashion_influencers(id) ON DELETE CASCADE,
  followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, influencer_id)
);

-- Index for follow relationships
CREATE INDEX IF NOT EXISTS idx_user_influencer_follows_user ON user_influencer_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_influencer_follows_influencer ON user_influencer_follows(influencer_id);

-- Comments
COMMENT ON TABLE user_influencer_follows IS 'Tracks which influencers users follow';
