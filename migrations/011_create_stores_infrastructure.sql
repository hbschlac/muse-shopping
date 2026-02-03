-- Create stores infrastructure for Connect scaffolding
-- Migration: 011_create_stores_infrastructure

-- Table: stores
-- Master list of retail stores where users shop
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255), -- "Old Navy" vs "OLD NAVY"
  description TEXT,
  logo_url TEXT,
  website_url TEXT NOT NULL,

  -- Integration method
  integration_type VARCHAR(50) NOT NULL DEFAULT 'redirect', -- 'oauth', 'redirect', 'api', 'manual'
  oauth_config JSONB, -- OAuth credentials if applicable
  api_config JSONB, -- API endpoints if applicable

  -- Capabilities
  supports_checkout BOOLEAN DEFAULT false,
  supports_order_history BOOLEAN DEFAULT false,
  supports_cart_api BOOLEAN DEFAULT false,

  -- Metadata
  category VARCHAR(100) DEFAULT 'fashion', -- 'fashion', 'home', 'beauty', etc.
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stores_slug ON stores(slug);
CREATE INDEX idx_stores_active ON stores(is_active);
CREATE INDEX idx_stores_category ON stores(category);

-- Table: store_aliases
-- Map email domains to stores
CREATE TABLE IF NOT EXISTS store_aliases (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  alias_type VARCHAR(50) NOT NULL, -- 'email_domain', 'subdomain', 'display_name'
  alias_value VARCHAR(255) NOT NULL,
  confidence_score INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(alias_value, alias_type)
);

CREATE INDEX idx_store_aliases_store_id ON store_aliases(store_id);
CREATE INDEX idx_store_aliases_type ON store_aliases(alias_type);
CREATE INDEX idx_store_aliases_value ON store_aliases(alias_value);

-- Table: user_store_accounts
-- Track which stores each user has accounts at
CREATE TABLE IF NOT EXISTS user_store_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- Account identification
  account_email VARCHAR(255), -- Email user uses for this store
  account_identifier TEXT, -- Store-specific customer ID if available

  -- Linking status
  is_linked BOOLEAN DEFAULT false, -- Has user authorized Muse to access?
  linking_method VARCHAR(50), -- 'auto_detected', 'manual', 'oauth'

  -- OAuth tokens (encrypted)
  oauth_access_token_encrypted TEXT,
  oauth_refresh_token_encrypted TEXT,
  oauth_token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Detection metadata
  first_detected_at TIMESTAMP WITH TIME ZONE, -- When we first saw them shop here
  last_order_detected_at TIMESTAMP WITH TIME ZONE, -- Most recent order we found
  total_orders_detected INTEGER DEFAULT 0, -- How many times we saw orders

  -- Verification
  is_verified BOOLEAN DEFAULT false, -- Did we confirm account ownership?
  verified_at TIMESTAMP WITH TIME ZONE,
  last_verified_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, store_id)
);

CREATE INDEX idx_user_store_accounts_user_id ON user_store_accounts(user_id);
CREATE INDEX idx_user_store_accounts_store_id ON user_store_accounts(store_id);
CREATE INDEX idx_user_store_accounts_linked ON user_store_accounts(is_linked);

-- Table: store_order_history
-- Track order history from email scans
CREATE TABLE IF NOT EXISTS store_order_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_store_account_id INTEGER REFERENCES user_store_accounts(id) ON DELETE SET NULL,

  -- Order details
  order_number VARCHAR(255), -- Store's order number
  order_date TIMESTAMP WITH TIME ZONE,
  order_total_cents INTEGER, -- Total in cents
  order_currency VARCHAR(3) DEFAULT 'USD',

  -- Source
  detected_from VARCHAR(50), -- 'email_scan', 'api_sync', 'manual_entry'
  source_email_id VARCHAR(255), -- Gmail message ID if from email

  -- Parsed data
  items_detected JSONB DEFAULT '[]', -- Products we identified
  raw_data JSONB DEFAULT '{}', -- Raw email/API data

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_store_order_history_user_id ON store_order_history(user_id);
CREATE INDEX idx_store_order_history_store_id ON store_order_history(store_id);
CREATE INDEX idx_store_order_history_date ON store_order_history(order_date DESC);
CREATE INDEX idx_store_order_history_account_id ON store_order_history(user_store_account_id);

-- Triggers for updated_at
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_aliases_updated_at
  BEFORE UPDATE ON store_aliases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_store_accounts_updated_at
  BEFORE UPDATE ON user_store_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_order_history_updated_at
  BEFORE UPDATE ON store_order_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE stores TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE store_aliases TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE user_store_accounts TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE store_order_history TO muse_admin;

GRANT USAGE, SELECT ON SEQUENCE stores_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE store_aliases_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE user_store_accounts_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE store_order_history_id_seq TO muse_admin;

-- Comments
COMMENT ON TABLE stores IS 'Master list of retail stores where users shop';
COMMENT ON TABLE store_aliases IS 'Email domain to store mappings for matching';
COMMENT ON TABLE user_store_accounts IS 'User accounts at each store for checkout';
COMMENT ON TABLE store_order_history IS 'Order history detected from emails';
