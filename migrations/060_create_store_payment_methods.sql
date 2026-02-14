-- Migration: Create user store payment methods table
-- Stores retailer-specific payment tokens for direct checkout

CREATE TABLE IF NOT EXISTS user_store_payment_methods (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  payment_token TEXT NOT NULL, -- Stripe payment method ID or retailer token
  payment_type VARCHAR(50) DEFAULT 'card', -- card, bank_account, digital_wallet
  last4 VARCHAR(4), -- Last 4 digits for display
  expiry_month INTEGER, -- Card expiry month (1-12)
  expiry_year INTEGER, -- Card expiry year (4 digits)
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint: one token per user/store combo
  CONSTRAINT unique_user_store_payment UNIQUE (user_id, store_id, payment_token)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_store_payment_methods_user ON user_store_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_user_store_payment_methods_store ON user_store_payment_methods(user_id, store_id);
CREATE INDEX IF NOT EXISTS idx_user_store_payment_methods_default ON user_store_payment_methods(user_id, store_id, is_default) WHERE is_default = true;

-- Comments
COMMENT ON TABLE user_store_payment_methods IS 'Stores payment tokens for retailer-specific checkouts';
COMMENT ON COLUMN user_store_payment_methods.payment_token IS 'Encrypted payment method token (Stripe PM ID or retailer token)';
COMMENT ON COLUMN user_store_payment_methods.is_default IS 'Whether this is the default payment method for this store';
