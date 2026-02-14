-- Migration: Create promo codes system
-- Supports percentage and fixed amount discounts

CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,

  -- Discount type and amount
  discount_type VARCHAR(20) NOT NULL, -- percentage, fixed_amount
  discount_value INTEGER NOT NULL, -- For percentage: 0-100, for fixed: cents
  min_purchase_cents INTEGER DEFAULT 0,
  max_discount_cents INTEGER, -- Cap for percentage discounts

  -- Validity
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,

  -- Usage limits
  max_uses INTEGER, -- NULL = unlimited
  max_uses_per_user INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,

  -- Store restrictions
  eligible_store_ids INTEGER[], -- NULL = all stores
  excluded_store_ids INTEGER[],

  -- Product restrictions
  eligible_product_types TEXT[], -- NULL = all types
  excluded_product_types TEXT[],

  -- Metadata
  created_by INTEGER REFERENCES users(id),
  promo_metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promo code usage tracking
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id SERIAL PRIMARY KEY,
  promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkout_session_id INTEGER REFERENCES checkout_sessions(id),
  order_id INTEGER REFERENCES orders(id),

  discount_applied_cents INTEGER NOT NULL,
  order_subtotal_cents INTEGER NOT NULL,

  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_user_session_promo UNIQUE (user_id, checkout_session_id, promo_code_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_promo ON promo_code_uses(promo_code_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_promo_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_promo_codes_updated_at ON promo_codes;

CREATE TRIGGER trigger_promo_codes_updated_at
BEFORE UPDATE ON promo_codes
FOR EACH ROW
EXECUTE FUNCTION update_promo_codes_updated_at();

-- Comments
COMMENT ON TABLE promo_codes IS 'Promo code definitions with discount rules and restrictions';
COMMENT ON COLUMN promo_codes.discount_type IS 'percentage (0-100) or fixed_amount (in cents)';
COMMENT ON COLUMN promo_codes.eligible_store_ids IS 'NULL = all stores, array = specific stores only';
COMMENT ON TABLE promo_code_uses IS 'Tracks promo code redemptions for usage limits';

-- Sample promo codes for testing
INSERT INTO promo_codes (code, description, discount_type, discount_value, max_uses, is_active, promo_metadata)
VALUES
  ('WELCOME10', '10% off first order', 'percentage', 10, NULL, true, '{"campaign": "welcome"}'),
  ('SAVE20', '$20 off orders over $100', 'fixed_amount', 2000, NULL, true, '{"campaign": "general"}'),
  ('FREESHIP', 'Free shipping', 'fixed_amount', 0, NULL, false, '{"type": "shipping", "note": "Not yet implemented"}')
ON CONFLICT (code) DO NOTHING;
