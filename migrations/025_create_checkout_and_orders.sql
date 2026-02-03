-- Migration: Create unified checkout and order system
-- Enables Muse to be merchant of record for multi-store purchases

-- =============================================================================
-- CHECKOUT SESSIONS
-- =============================================================================
-- Represents a single checkout session where user purchases from multiple stores
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Session identification
  session_id VARCHAR(100) NOT NULL UNIQUE, -- cs_xxx format

  -- Cart snapshot (frozen at checkout start)
  cart_snapshot JSONB NOT NULL, -- Full cart data at time of checkout

  -- Customer info
  shipping_address JSONB, -- { name, address1, address2, city, state, zip, country, phone }
  billing_address JSONB,

  -- Payment info (tokenized)
  stripe_payment_intent_id VARCHAR(255), -- Stripe payment intent
  payment_method_id VARCHAR(255), -- Stripe payment method

  -- Totals
  subtotal_cents INT NOT NULL DEFAULT 0,
  shipping_cents INT NOT NULL DEFAULT 0,
  tax_cents INT NOT NULL DEFAULT 0,
  total_cents INT NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Session status
  status VARCHAR(50) DEFAULT 'pending', -- pending, payment_captured, processing, completed, failed, cancelled

  -- Store checkout progress
  stores_to_process JSONB, -- [{ storeId, storeName, itemCount, subtotalCents, status }]

  -- Error tracking
  error_message TEXT,
  retry_count INT DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  payment_captured_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- 30 minutes from start

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checkout_sessions_user ON checkout_sessions(user_id);
CREATE INDEX idx_checkout_sessions_session_id ON checkout_sessions(session_id);
CREATE INDEX idx_checkout_sessions_status ON checkout_sessions(status);
CREATE INDEX idx_checkout_sessions_created ON checkout_sessions(created_at DESC);

-- =============================================================================
-- ORDERS
-- =============================================================================
-- Each order represents a purchase from ONE store within a checkout session
-- One checkout session -> multiple orders (one per store)
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checkout_session_id INT NOT NULL REFERENCES checkout_sessions(id) ON DELETE CASCADE,
  store_id INT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,

  -- Order identification
  muse_order_number VARCHAR(50) NOT NULL UNIQUE, -- MO-XXXXX (Muse's internal order number)
  store_order_number VARCHAR(255), -- Retailer's order number (when available)

  -- Order totals
  subtotal_cents INT NOT NULL,
  shipping_cents INT DEFAULT 0,
  tax_cents INT DEFAULT 0,
  total_cents INT NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Fulfillment info
  shipping_address JSONB NOT NULL, -- Copied from checkout session
  tracking_number VARCHAR(255),
  carrier VARCHAR(100), -- USPS, FedEx, UPS, etc.

  -- Order status
  status VARCHAR(50) DEFAULT 'pending',
  -- pending: Not yet placed with retailer
  -- placed: Successfully placed with retailer
  -- confirmed: Retailer confirmed receipt
  -- shipped: Retailer shipped the order
  -- delivered: Customer received
  -- cancelled: Order cancelled
  -- failed: Failed to place with retailer

  placement_method VARCHAR(50), -- 'api', 'headless', 'manual', 'redirect'

  -- Timestamps
  placed_at TIMESTAMP WITH TIME ZONE, -- When order was placed with retailer
  confirmed_at TIMESTAMP WITH TIME ZONE, -- When retailer confirmed
  shipped_at TIMESTAMP WITH TIME ZONE,
  estimated_delivery_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Error handling
  placement_error TEXT, -- Error message if placement failed
  placement_attempts INT DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}', -- Store-specific data, tracking info, etc.

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_checkout_session ON orders(checkout_session_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_muse_number ON orders(muse_order_number);
CREATE INDEX idx_orders_store_number ON orders(store_order_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- =============================================================================
-- ORDER ITEMS
-- =============================================================================
-- Individual products within an order
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Product details (snapshot from cart at checkout time)
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  product_url TEXT,
  product_image_url TEXT,
  product_description TEXT,

  -- Variant details
  size VARCHAR(50),
  color VARCHAR(50),
  quantity INT NOT NULL CHECK (quantity > 0),

  -- Pricing (at time of purchase)
  unit_price_cents INT NOT NULL,
  total_price_cents INT NOT NULL, -- unit_price * quantity
  original_price_cents INT, -- For showing what discount they got

  -- Item-specific tracking
  item_status VARCHAR(50) DEFAULT 'pending', -- pending, shipped, delivered, returned, cancelled
  tracking_number VARCHAR(255), -- Some retailers provide per-item tracking

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(item_status);

-- =============================================================================
-- ORDER STATUS HISTORY
-- =============================================================================
-- Track all status changes for audit trail
CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,

  notes TEXT, -- Human-readable explanation
  metadata JSONB DEFAULT '{}', -- System data (API responses, etc.)

  changed_by VARCHAR(50) DEFAULT 'system', -- 'system', 'user', 'admin', 'retailer'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created ON order_status_history(created_at DESC);

-- =============================================================================
-- PAYMENT TRANSACTIONS
-- =============================================================================
-- Track all payment-related transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  checkout_session_id INT NOT NULL REFERENCES checkout_sessions(id) ON DELETE CASCADE,

  -- Transaction identification
  transaction_id VARCHAR(100) NOT NULL UNIQUE, -- txn_xxx
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),

  -- Transaction details
  amount_cents INT NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  transaction_type VARCHAR(50) NOT NULL, -- 'charge', 'refund', 'partial_refund'
  status VARCHAR(50) DEFAULT 'pending', -- pending, succeeded, failed, cancelled

  -- Payment method
  payment_method_type VARCHAR(50), -- 'card', 'apple_pay', 'google_pay'
  last4 VARCHAR(4), -- Last 4 of card

  -- Error handling
  failure_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_transactions_checkout ON payment_transactions(checkout_session_id);
CREATE INDEX idx_payment_transactions_stripe_intent ON payment_transactions(stripe_payment_intent_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated_at trigger for checkout_sessions
CREATE TRIGGER checkout_sessions_updated_at_trigger
BEFORE UPDATE ON checkout_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for orders
CREATE TRIGGER orders_updated_at_trigger
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for payment_transactions
CREATE TRIGGER payment_transactions_updated_at_trigger
BEFORE UPDATE ON payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to record order status changes
CREATE OR REPLACE FUNCTION record_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, from_status, to_status, notes)
    VALUES (NEW.id, OLD.status, NEW.status, 'Status changed from ' || COALESCE(OLD.status, 'null') || ' to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_change_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION record_order_status_change();

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

GRANT ALL PRIVILEGES ON TABLE checkout_sessions TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE orders TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE order_items TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE order_status_history TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE payment_transactions TO muse_admin;

GRANT USAGE, SELECT ON SEQUENCE checkout_sessions_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE orders_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE order_items_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE order_status_history_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE payment_transactions_id_seq TO muse_admin;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE checkout_sessions IS 'Unified checkout sessions where users purchase from multiple stores';
COMMENT ON TABLE orders IS 'Individual orders placed with retailers (one per store per checkout)';
COMMENT ON TABLE order_items IS 'Products within each order';
COMMENT ON TABLE order_status_history IS 'Audit trail of all order status changes';
COMMENT ON TABLE payment_transactions IS 'Payment processing transactions via Stripe';

COMMENT ON COLUMN checkout_sessions.cart_snapshot IS 'Frozen cart data at checkout time to preserve pricing';
COMMENT ON COLUMN checkout_sessions.stores_to_process IS 'Array of stores with their processing status';
COMMENT ON COLUMN orders.muse_order_number IS 'Muse internal order number shown to customer';
COMMENT ON COLUMN orders.store_order_number IS 'Retailer order number received after placement';
COMMENT ON COLUMN orders.placement_method IS 'How order was placed: api, headless automation, manual, or redirect';
