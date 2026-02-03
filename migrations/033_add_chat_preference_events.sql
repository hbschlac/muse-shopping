-- Chat preference extraction events

CREATE TABLE IF NOT EXISTS chat_preference_events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id INTEGER REFERENCES chat_sessions(id) ON DELETE SET NULL,
  message_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
  categories JSONB,
  subcategories JSONB,
  attributes JSONB,
  price_min INTEGER,
  price_max INTEGER,
  on_sale BOOLEAN,
  in_stock BOOLEAN,
  source VARCHAR(50) DEFAULT 'chat',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_preference_events_user_id ON chat_preference_events(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_preference_events_session_id ON chat_preference_events(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_preference_events_created_at ON chat_preference_events(created_at DESC);
