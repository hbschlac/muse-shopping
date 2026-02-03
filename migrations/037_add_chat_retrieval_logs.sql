-- Chat retrieval logs

CREATE TABLE IF NOT EXISTS chat_retrieval_logs (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES chat_sessions(id) ON DELETE SET NULL,
  message_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
  query TEXT,
  sources JSONB,
  items JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_retrieval_logs_session_id ON chat_retrieval_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_retrieval_logs_created_at ON chat_retrieval_logs(created_at DESC);
