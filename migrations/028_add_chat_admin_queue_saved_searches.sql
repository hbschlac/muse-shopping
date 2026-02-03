-- Chat admin queue + saved searches + labels

ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS label VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_label ON chat_sessions(label);

CREATE TABLE IF NOT EXISTS chat_admin_saved_searches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  filters JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_admin_saved_searches_admin_user_id ON chat_admin_saved_searches(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_admin_saved_searches_created_at ON chat_admin_saved_searches(created_at DESC);
