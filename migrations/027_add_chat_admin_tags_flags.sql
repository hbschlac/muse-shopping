-- Chat admin tagging and flagging

CREATE TABLE IF NOT EXISTS chat_session_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_session_tag_map (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES chat_session_tags(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_session_tag_map_session_id ON chat_session_tag_map(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_tag_map_tag_id ON chat_session_tag_map(tag_id);

CREATE TABLE IF NOT EXISTS chat_session_flags (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_session_flags_session_id ON chat_session_flags(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_flags_status ON chat_session_flags(status);
CREATE INDEX IF NOT EXISTS idx_chat_session_flags_created_at ON chat_session_flags(created_at DESC);
