-- Chat human review pipeline

CREATE TABLE IF NOT EXISTS chat_review_items (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
  message_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'open',
  priority INTEGER DEFAULT 2,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_chat_review_items_status ON chat_review_items(status);
CREATE INDEX IF NOT EXISTS idx_chat_review_items_created_at ON chat_review_items(created_at DESC);
