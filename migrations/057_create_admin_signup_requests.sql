-- Admin Signup Requests System
-- Migration: 057_create_admin_signup_requests

-- Table: admin_signup_requests
-- Stores pending admin access requests that need approval
CREATE TABLE IF NOT EXISTS admin_signup_requests (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_request_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX idx_admin_signup_requests_status ON admin_signup_requests(status);
CREATE INDEX idx_admin_signup_requests_email ON admin_signup_requests(email);
CREATE INDEX idx_admin_signup_requests_created_at ON admin_signup_requests(created_at DESC);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE admin_signup_requests TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE admin_signup_requests_id_seq TO muse_admin;
