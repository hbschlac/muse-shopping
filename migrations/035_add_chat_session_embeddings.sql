-- Chat session embeddings

CREATE TABLE IF NOT EXISTS chat_session_embeddings (
  session_id INTEGER PRIMARY KEY REFERENCES chat_sessions(id) ON DELETE CASCADE,
  embedding FLOAT8[],
  embedding_model VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_session_embeddings_updated_at ON chat_session_embeddings(updated_at DESC);
