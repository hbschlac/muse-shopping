-- Migration: Add image content moderation logging
-- This table tracks all image uploads in chat for safety monitoring

CREATE TABLE IF NOT EXISTS chat_image_moderation_logs (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES chat_sessions(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,

  -- Moderation results
  is_safe BOOLEAN NOT NULL,
  reason TEXT,
  categories JSONB,

  -- Image metadata
  image_size_bytes INTEGER,
  image_format VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for analytics
CREATE INDEX idx_image_moderation_user ON chat_image_moderation_logs (user_id, created_at DESC);
CREATE INDEX idx_image_moderation_safety ON chat_image_moderation_logs (is_safe, created_at DESC);
CREATE INDEX idx_image_moderation_session ON chat_image_moderation_logs (session_id);

-- Add comment for documentation
COMMENT ON TABLE chat_image_moderation_logs IS 'Logs all image uploads in chat with moderation results for safety monitoring';
COMMENT ON COLUMN chat_image_moderation_logs.is_safe IS 'Whether the image passed content moderation checks';
COMMENT ON COLUMN chat_image_moderation_logs.reason IS 'Explanation if image was flagged as unsafe';
COMMENT ON COLUMN chat_image_moderation_logs.categories IS 'Detailed moderation flags (nudity, violence, etc.)';
