-- Chat segments

CREATE TABLE IF NOT EXISTS chat_segments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_segment_members (
  id SERIAL PRIMARY KEY,
  segment_id INTEGER REFERENCES chat_segments(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(segment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_segment_members_segment ON chat_segment_members(segment_id);
CREATE INDEX IF NOT EXISTS idx_chat_segment_members_user ON chat_segment_members(user_id);
