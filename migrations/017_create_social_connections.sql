-- Migration: Create social_connections table for Instagram/Facebook OAuth
-- Stores OAuth tokens and user data for connected social media accounts

-- Create social_connections table
CREATE TABLE IF NOT EXISTS social_connections (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'instagram', 'facebook', 'tiktok', etc.
  provider_user_id VARCHAR(255) NOT NULL, -- User's ID on the social platform
  username VARCHAR(255), -- Social media username
  display_name VARCHAR(255), -- Display name on platform
  profile_picture_url TEXT,
  access_token_encrypted TEXT NOT NULL, -- Encrypted OAuth access token
  refresh_token_encrypted TEXT, -- Encrypted refresh token (if provided)
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[], -- Array of granted permissions
  is_active BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_provider UNIQUE(user_id, provider),
  CONSTRAINT unique_provider_user UNIQUE(provider, provider_user_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_social_connections_user ON social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_provider ON social_connections(provider);
CREATE INDEX IF NOT EXISTS idx_social_connections_active ON social_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_social_connections_expires ON social_connections(token_expires_at);

-- Create trigger to auto-update updated_at timestamp
CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON social_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE social_connections IS 'Stores OAuth connections to social media platforms (Instagram, Facebook, TikTok, etc.)';
COMMENT ON COLUMN social_connections.provider IS 'Social platform name: instagram, facebook, tiktok, etc.';
COMMENT ON COLUMN social_connections.provider_user_id IS 'Unique ID of the user on the social platform';
COMMENT ON COLUMN social_connections.username IS 'Username/handle on the social platform';
COMMENT ON COLUMN social_connections.access_token_encrypted IS 'Encrypted OAuth access token for API access';
COMMENT ON COLUMN social_connections.refresh_token_encrypted IS 'Encrypted refresh token for renewing access';
COMMENT ON COLUMN social_connections.token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN social_connections.scopes IS 'Array of OAuth scopes/permissions granted';
COMMENT ON COLUMN social_connections.last_synced_at IS 'Last time data was synced from this platform';
