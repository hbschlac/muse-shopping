-- Migration: Create OAuth store connection system
-- Enables users to connect their retailer accounts to Muse

-- =============================================================================
-- USER STORE CONNECTIONS (OAuth)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_store_connections (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- OAuth tokens (ENCRYPTED - never store plain text)
  oauth_access_token_encrypted TEXT NOT NULL,
  oauth_refresh_token_encrypted TEXT NOT NULL,
  oauth_token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Connection status
  is_connected BOOLEAN DEFAULT true,
  connection_status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'revoked', 'error'

  -- Retailer customer info
  retailer_customer_id VARCHAR(255), -- Store's internal customer ID
  retailer_email VARCHAR(255), -- Email user uses at that store

  -- Permissions granted by user
  scopes_granted TEXT[], -- ['orders', 'payment_methods', 'addresses', 'profile']

  -- Sync tracking
  last_synced_at TIMESTAMP WITH TIME ZONE,
  last_sync_error TEXT,

  -- Timestamps
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  disconnected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, store_id)
);

CREATE INDEX idx_user_store_conn_user ON user_store_connections(user_id);
CREATE INDEX idx_user_store_conn_store ON user_store_connections(store_id);
CREATE INDEX idx_user_store_conn_status ON user_store_connections(connection_status);

-- =============================================================================
-- USER SAVED PAYMENT METHODS (from retailers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_saved_payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_store_connection_id INT REFERENCES user_store_connections(id) ON DELETE CASCADE,

  -- Payment method reference at retailer (NOT the actual card number!)
  retailer_payment_method_id VARCHAR(255) NOT NULL,

  -- Display info (SAFE to store - no sensitive data)
  card_brand VARCHAR(50), -- 'Visa', 'Mastercard', 'Amex', 'Discover'
  last4 VARCHAR(4), -- Last 4 digits only
  exp_month INT,
  exp_year INT,

  -- Payment type
  payment_type VARCHAR(50) DEFAULT 'card', -- 'card', 'apple_pay', 'paypal', 'venmo'

  -- Billing address (summary only)
  billing_zip VARCHAR(20),

  -- Status
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_expired BOOLEAN DEFAULT false,

  -- Metadata
  nickname VARCHAR(100), -- User-assigned name: "My Visa", "Work Card"
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, store_id, retailer_payment_method_id)
);

CREATE INDEX idx_user_payment_methods_user ON user_saved_payment_methods(user_id);
CREATE INDEX idx_user_payment_methods_store ON user_saved_payment_methods(store_id);
CREATE INDEX idx_user_payment_methods_conn ON user_saved_payment_methods(user_store_connection_id);
CREATE INDEX idx_user_payment_methods_default ON user_saved_payment_methods(user_id, is_default) WHERE is_default = true;

-- =============================================================================
-- USER SAVED ADDRESSES (from retailers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_saved_addresses (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INT REFERENCES stores(id) ON DELETE CASCADE, -- NULL = multi-store address
  user_store_connection_id INT REFERENCES user_store_connections(id) ON DELETE CASCADE,

  -- Address reference at retailer (if synced from retailer)
  retailer_address_id VARCHAR(255),

  -- Address details
  name VARCHAR(255) NOT NULL,
  address1 VARCHAR(255) NOT NULL,
  address2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(50) NOT NULL,
  zip VARCHAR(20) NOT NULL,
  country VARCHAR(2) DEFAULT 'US',
  phone VARCHAR(50),

  -- Address type
  address_type VARCHAR(50) DEFAULT 'shipping', -- 'shipping', 'billing', 'both'

  -- Status
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Validation
  is_verified BOOLEAN DEFAULT false, -- USPS address verification
  verified_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  nickname VARCHAR(100), -- "Home", "Work", "Mom's House"
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_addresses_user ON user_saved_addresses(user_id);
CREATE INDEX idx_user_addresses_store ON user_saved_addresses(store_id);
CREATE INDEX idx_user_addresses_default ON user_saved_addresses(user_id, is_default) WHERE is_default = true;

-- =============================================================================
-- OAUTH STATES (for security)
-- =============================================================================
-- Temporary table to track OAuth state parameters
CREATE TABLE IF NOT EXISTS oauth_states (
  id SERIAL PRIMARY KEY,
  state_token VARCHAR(255) NOT NULL UNIQUE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- CSRF protection
  nonce VARCHAR(255),

  -- Return URL after OAuth
  return_url TEXT,

  -- Status
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,

  -- Auto-cleanup
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_oauth_states_token ON oauth_states(state_token);
CREATE INDEX idx_oauth_states_expires ON oauth_states(expires_at);

-- Auto-delete expired states (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- UPDATE EXISTING ORDERS TABLE
-- =============================================================================
-- Add OAuth and retailer payment tracking to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_store_connection_id INT REFERENCES user_store_connections(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS retailer_payment_method_id VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_processed_by VARCHAR(50) DEFAULT 'retailer';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS retailer_customer_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_orders_connection ON orders(user_store_connection_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER user_store_connections_updated_at_trigger
BEFORE UPDATE ON user_store_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_saved_payment_methods_updated_at_trigger
BEFORE UPDATE ON user_saved_payment_methods
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_saved_addresses_updated_at_trigger
BEFORE UPDATE ON user_saved_addresses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

GRANT ALL PRIVILEGES ON TABLE user_store_connections TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE user_saved_payment_methods TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE user_saved_addresses TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE oauth_states TO muse_admin;

GRANT USAGE, SELECT ON SEQUENCE user_store_connections_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE user_saved_payment_methods_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE user_saved_addresses_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE oauth_states_id_seq TO muse_admin;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE user_store_connections IS 'OAuth connections between users and retailer accounts';
COMMENT ON COLUMN user_store_connections.oauth_access_token_encrypted IS 'ENCRYPTED access token - decrypt before use';
COMMENT ON COLUMN user_store_connections.oauth_refresh_token_encrypted IS 'ENCRYPTED refresh token - decrypt before use';

COMMENT ON TABLE user_saved_payment_methods IS 'User payment methods synced from retailer accounts (display only - no sensitive data)';
COMMENT ON COLUMN user_saved_payment_methods.retailer_payment_method_id IS 'Reference to payment method at retailer - used to charge via their API';

COMMENT ON TABLE user_saved_addresses IS 'User shipping addresses - can be synced from retailers or added directly';

COMMENT ON TABLE oauth_states IS 'Temporary OAuth state tokens for CSRF protection during OAuth flow';
