-- Chat evaluation runs

CREATE TABLE IF NOT EXISTS chat_eval_runs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  total_cases INTEGER DEFAULT 0,
  passed_cases INTEGER DEFAULT 0,
  failed_cases INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_eval_cases (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES chat_eval_runs(id) ON DELETE CASCADE,
  case_name VARCHAR(255) NOT NULL,
  prompt TEXT NOT NULL,
  expected JSONB,
  actual JSONB,
  passed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_eval_runs_created_at ON chat_eval_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_eval_cases_run_id ON chat_eval_cases(run_id);
