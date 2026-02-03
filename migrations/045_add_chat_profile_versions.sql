-- Chat profile versioning

CREATE TABLE IF NOT EXISTS chat_profile_versions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  snapshot JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_profile_versions_user_id ON chat_profile_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_profile_versions_created_at ON chat_profile_versions(created_at DESC);
