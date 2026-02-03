-- Chat export run history

CREATE TABLE IF NOT EXISTS chat_export_runs (
  id SERIAL PRIMARY KEY,
  storage_provider VARCHAR(50) NOT NULL,
  bucket VARCHAR(255),
  export_key TEXT,
  format VARCHAR(10) NOT NULL,
  only_flagged BOOLEAN DEFAULT false,
  from_date TIMESTAMP,
  to_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'completed',
  record_counts JSONB,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_export_runs_created_at ON chat_export_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_export_runs_storage_provider ON chat_export_runs(storage_provider);
CREATE INDEX IF NOT EXISTS idx_chat_export_runs_only_flagged ON chat_export_runs(only_flagged);
