-- Add Security Features
-- Migration: 021_add_security_features
-- Purpose: Add role-based access control, audit logging, and security features

-- ========================================
-- 1. Add Role-Based Access Control to Users
-- ========================================

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- Add security fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;

-- Create index on role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update existing users to have 'user' role
UPDATE users SET role = 'user' WHERE role IS NULL;

-- ========================================
-- 2. Create Audit Log Table
-- ========================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,

  -- Who performed the action
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,

  -- What action was performed
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'read', 'export', etc.
  resource_type VARCHAR(100) NOT NULL, -- 'user', 'product', 'cart', 'analytics', etc.
  resource_id VARCHAR(255), -- ID of the affected resource

  -- Action details
  description TEXT,
  metadata JSONB DEFAULT '{}', -- Additional context

  -- Before/After (for updates)
  old_values JSONB,
  new_values JSONB,

  -- Result
  status VARCHAR(50) DEFAULT 'success', -- 'success', 'failure', 'unauthorized'
  error_message TEXT,

  -- Severity
  severity VARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'critical'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- ========================================
-- 3. Create API Rate Limiting Table
-- ========================================

CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  id SERIAL PRIMARY KEY,

  -- Identifier (could be user_id, IP, or API key)
  identifier VARCHAR(255) NOT NULL,
  identifier_type VARCHAR(50) NOT NULL, -- 'user', 'ip', 'api_key'

  -- Endpoint tracking
  endpoint VARCHAR(255) NOT NULL,

  -- Request counts
  requests_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Blocked tracking
  is_blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_tracking(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_endpoint ON rate_limit_tracking(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_tracking(window_start);

-- ========================================
-- 4. Create Security Events Table
-- ========================================

CREATE TABLE IF NOT EXISTS security_events (
  id SERIAL PRIMARY KEY,

  event_type VARCHAR(100) NOT NULL, -- 'failed_login', 'suspicious_activity', 'account_locked', etc.
  severity VARCHAR(50) DEFAULT 'warning', -- 'info', 'warning', 'critical'

  -- User context
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255),
  ip_address INET,
  user_agent TEXT,

  -- Event details
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Response
  action_taken VARCHAR(255), -- 'account_locked', 'alert_sent', 'blocked_ip', etc.
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);

-- ========================================
-- 5. Create Data Access Log (for GDPR compliance)
-- ========================================

CREATE TABLE IF NOT EXISTS data_access_logs (
  id SERIAL PRIMARY KEY,

  -- Who accessed the data
  accessor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  accessor_role VARCHAR(50),

  -- Whose data was accessed
  subject_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- What was accessed
  data_type VARCHAR(100) NOT NULL, -- 'profile', 'purchases', 'analytics', 'cart', etc.
  access_type VARCHAR(50) NOT NULL, -- 'read', 'export', 'delete'

  -- Context
  purpose VARCHAR(255), -- 'support_request', 'analytics', 'admin_review', etc.
  ip_address INET,

  -- Metadata
  query_details JSONB,
  records_accessed INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_data_access_logs_accessor ON data_access_logs(accessor_user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_subject ON data_access_logs(subject_user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_type ON data_access_logs(data_type);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_created_at ON data_access_logs(created_at DESC);

-- ========================================
-- 6. Create Session Security Table
-- ========================================

CREATE TABLE IF NOT EXISTS user_sessions_security (
  id SERIAL PRIMARY KEY,

  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  refresh_token VARCHAR(255) UNIQUE,

  -- Session metadata
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),

  -- Security
  is_active BOOLEAN DEFAULT true,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  refresh_expires_at TIMESTAMP WITH TIME ZONE,

  -- Revocation
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revocation_reason VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_security_user_id ON user_sessions_security(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_security_token ON user_sessions_security(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_security_active ON user_sessions_security(is_active, expires_at);

-- ========================================
-- 7. Create API Keys Table (for external integrations)
-- ========================================

CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,

  -- Owner
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- Friendly name for the key

  -- Key
  key_hash VARCHAR(255) UNIQUE NOT NULL, -- Hashed API key
  key_prefix VARCHAR(10) NOT NULL, -- First 8 chars for identification

  -- Permissions
  scopes JSONB DEFAULT '[]', -- ['read:products', 'write:cart', etc.]

  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,

  -- Usage tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  total_requests INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active, expires_at);

-- ========================================
-- 8. Create Triggers for Audit Logging
-- ========================================

-- Function to log security-sensitive updates
CREATE OR REPLACE FUNCTION log_user_security_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      description,
      old_values,
      new_values,
      severity
    ) VALUES (
      NEW.id,
      'role_change',
      'user',
      NEW.id::TEXT,
      'User role changed',
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      'warning'
    );
  END IF;

  -- Log account locking
  IF OLD.account_locked IS DISTINCT FROM NEW.account_locked AND NEW.account_locked = true THEN
    INSERT INTO security_events (
      event_type,
      severity,
      user_id,
      email,
      description,
      action_taken
    ) VALUES (
      'account_locked',
      'warning',
      NEW.id,
      NEW.email,
      'Account locked due to security policy',
      'account_locked'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to users table
DROP TRIGGER IF EXISTS user_security_audit ON users;
CREATE TRIGGER user_security_audit
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_security_changes();

-- ========================================
-- 9. Views for Security Monitoring
-- ========================================

-- View: Recent failed login attempts
CREATE OR REPLACE VIEW failed_login_attempts AS
SELECT
  user_id,
  email,
  COUNT(*) as attempt_count,
  MAX(created_at) as last_attempt,
  array_agg(DISTINCT ip_address::TEXT) as ip_addresses
FROM security_events
WHERE event_type = 'failed_login'
  AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
GROUP BY user_id, email
HAVING COUNT(*) >= 3;

-- View: High-risk security events
CREATE OR REPLACE VIEW high_risk_security_events AS
SELECT *
FROM security_events
WHERE severity = 'critical'
  AND resolved = false
ORDER BY created_at DESC;

-- View: Active admin sessions
CREATE OR REPLACE VIEW active_admin_sessions AS
SELECT
  u.id as user_id,
  u.email,
  u.role,
  s.session_token,
  s.ip_address,
  s.last_activity_at,
  s.created_at as session_started
FROM users u
JOIN user_sessions_security s ON u.id = s.user_id
WHERE u.role IN ('admin', 'super_admin')
  AND s.is_active = true
  AND s.expires_at > CURRENT_TIMESTAMP
ORDER BY s.last_activity_at DESC;

-- ========================================
-- 10. Grant Permissions
-- ========================================

GRANT ALL PRIVILEGES ON TABLE audit_logs TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE rate_limit_tracking TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE security_events TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE data_access_logs TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE user_sessions_security TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE api_keys TO muse_admin;

GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE rate_limit_tracking_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE security_events_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE data_access_logs_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE user_sessions_security_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE api_keys_id_seq TO muse_admin;
