-- Chat intent clustering

CREATE TABLE IF NOT EXISTS chat_intent_clusters (
  id SERIAL PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_intent_cluster_members (
  id SERIAL PRIMARY KEY,
  cluster_id INTEGER REFERENCES chat_intent_clusters(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES chat_sessions(id) ON DELETE CASCADE,
  message_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_intent_cluster_members_cluster_id ON chat_intent_cluster_members(cluster_id);
CREATE INDEX IF NOT EXISTS idx_chat_intent_cluster_members_created_at ON chat_intent_cluster_members(created_at DESC);
