-- Chat job run logs + restore audits

CREATE TABLE IF NOT EXISTS chat_job_runs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'completed',
  run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_chat_job_runs_job_name ON chat_job_runs(job_name);
CREATE INDEX IF NOT EXISTS idx_chat_job_runs_run_at ON chat_job_runs(run_at DESC);

CREATE TABLE IF NOT EXISTS chat_profile_restore_audits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  version_id INTEGER REFERENCES chat_profile_versions(id) ON DELETE SET NULL,
  restored_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_profile_restore_audits_user_id ON chat_profile_restore_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_profile_restore_audits_created_at ON chat_profile_restore_audits(created_at DESC);
