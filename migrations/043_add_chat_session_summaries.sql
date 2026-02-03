-- Session intent summary

CREATE TABLE IF NOT EXISTS chat_session_summaries (
  session_id INTEGER PRIMARY KEY REFERENCES chat_sessions(id) ON DELETE CASCADE,
  summary TEXT,
  intents JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_session_summaries_updated_at ON chat_session_summaries(updated_at DESC);
