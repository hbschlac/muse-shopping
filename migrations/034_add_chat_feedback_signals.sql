-- Chat feedback signals

CREATE TABLE IF NOT EXISTS chat_feedback_signals (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
  session_id INTEGER REFERENCES chat_sessions(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER,
  intent JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_feedback_signals_user_id ON chat_feedback_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_signals_created_at ON chat_feedback_signals(created_at DESC);
