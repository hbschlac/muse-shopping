-- Admin Email System
-- Migration: 056_create_admin_email_system

-- Table: admin_email_logs
-- Logs individual email sends from admins to shoppers
CREATE TABLE IF NOT EXISTS admin_email_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(500) NOT NULL,
  email_type VARCHAR(50) NOT NULL DEFAULT 'transactional', -- 'marketing' or 'transactional'
  sent_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL, -- 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_email_type CHECK (email_type IN ('marketing', 'transactional')),
  CONSTRAINT valid_status CHECK (status IN ('sent', 'failed'))
);

CREATE INDEX idx_admin_email_logs_user_id ON admin_email_logs(user_id);
CREATE INDEX idx_admin_email_logs_sent_at ON admin_email_logs(sent_at DESC);
CREATE INDEX idx_admin_email_logs_status ON admin_email_logs(status);
CREATE INDEX idx_admin_email_logs_admin_id ON admin_email_logs(sent_by_admin_id);

-- Table: admin_email_bulk_sends
-- Tracks bulk email campaigns
CREATE TABLE IF NOT EXISTS admin_email_bulk_sends (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(500) NOT NULL,
  email_type VARCHAR(50) NOT NULL DEFAULT 'marketing',
  total_recipients INTEGER NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  emails_failed INTEGER DEFAULT 0,
  sent_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_bulk_email_type CHECK (email_type IN ('marketing', 'transactional'))
);

CREATE INDEX idx_admin_email_bulk_sends_created_at ON admin_email_bulk_sends(created_at DESC);
CREATE INDEX idx_admin_email_bulk_sends_admin_id ON admin_email_bulk_sends(sent_by_admin_id);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE admin_email_logs TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE admin_email_bulk_sends TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE admin_email_logs_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE admin_email_bulk_sends_id_seq TO muse_admin;
