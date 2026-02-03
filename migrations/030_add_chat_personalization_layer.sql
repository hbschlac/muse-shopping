-- Chat personalization data layer

CREATE TABLE IF NOT EXISTS user_chat_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  embedding FLOAT8[],
  embedding_model VARCHAR(100),
  summary TEXT,
  traits JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_chat_profiles_updated_at ON user_chat_profiles(updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_session_memory (
  session_id INTEGER PRIMARY KEY REFERENCES chat_sessions(id) ON DELETE CASCADE,
  summary TEXT,
  entities JSONB,
  preferences JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_session_memory_updated_at ON chat_session_memory(updated_at DESC);
