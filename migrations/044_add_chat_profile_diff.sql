-- Profile diff snapshots

CREATE TABLE IF NOT EXISTS chat_profile_diffs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  before_profile JSONB,
  after_profile JSONB,
  source VARCHAR(50) DEFAULT 'chat',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_profile_diffs_user_id ON chat_profile_diffs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_profile_diffs_created_at ON chat_profile_diffs(created_at DESC);
