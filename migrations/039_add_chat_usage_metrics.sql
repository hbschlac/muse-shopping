-- Chat usage metrics (latency, tokens, cost scaffolding)

CREATE TABLE IF NOT EXISTS chat_usage_metrics (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES chat_sessions(id) ON DELETE SET NULL,
  message_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
  model VARCHAR(100),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_usage_metrics_created_at ON chat_usage_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_usage_metrics_model ON chat_usage_metrics(model);
