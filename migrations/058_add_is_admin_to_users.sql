-- Add is_admin column to users table
-- Migration: 058_add_is_admin_to_users

-- Add is_admin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
    CREATE INDEX idx_users_is_admin ON users(is_admin) WHERE is_admin = TRUE;
  END IF;
END $$;

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE users TO muse_admin;
