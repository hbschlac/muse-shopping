-- Chat admin notes

CREATE TABLE IF NOT EXISTS chat_session_notes (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_session_notes_session_id ON chat_session_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_notes_admin_user_id ON chat_session_notes(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_notes_created_at ON chat_session_notes(created_at DESC);
