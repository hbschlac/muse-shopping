-- Chat safety audit logging

CREATE TABLE IF NOT EXISTS chat_safety_audits (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES chat_sessions(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  input_excerpt TEXT,
  output_excerpt TEXT,
  decision VARCHAR(50) NOT NULL,
  categories JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_safety_audits_created_at ON chat_safety_audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_safety_audits_decision ON chat_safety_audits(decision);
