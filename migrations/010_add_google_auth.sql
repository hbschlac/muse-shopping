-- Add Google OAuth support to users table
-- Migration: 010_add_google_auth

-- Add google_id column for linking Google accounts
ALTER TABLE users
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster Google ID lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Update email_verified column to allow NULL (for Google users it's verified by default)
ALTER TABLE users
ALTER COLUMN email_verified DROP NOT NULL;

-- Make password_hash nullable (Google users don't have passwords)
ALTER TABLE users
ALTER COLUMN password_hash DROP NOT NULL;

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE users TO muse_admin;

-- Add comment
COMMENT ON COLUMN users.google_id IS 'Google OAuth ID for "Sign in with Google" users';
COMMENT ON COLUMN users.last_login_at IS 'Timestamp of last successful login';
