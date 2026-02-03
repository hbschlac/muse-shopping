-- Migration: Create returns system
-- Enables users to initiate and track returns via retailer APIs

-- =============================================================================
-- RETURNS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS returns (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- Retailer return tracking
  store_return_id VARCHAR(255), -- Retailer's return ID (e.g., "NORD-RET-789456")
  store_return_number VARCHAR(100), -- Display number for customer

  -- Return details
  return_reason VARCHAR(100), -- 'wrong_size', 'wrong_color', 'quality', 'changed_mind', 'other'
  return_reason_details TEXT,

  -- Return method
  return_method VARCHAR(50), -- 'ship', 'in_store', 'pickup'

  -- Return label
  return_label_url TEXT,
  return_label_qr_code TEXT, -- Base64 QR code for in-store returns
  return_tracking_number VARCHAR(100),
  return_carrier VARCHAR(50),

  -- Refund details
  refund_amount_cents INT NOT NULL,
  refund_method VARCHAR(50), -- 'original_payment', 'store_credit', 'gift_card'
  refund_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  estimated_refund_date DATE,
  actual_refund_date DATE,

  -- Return status
  return_status VARCHAR(50) DEFAULT 'initiated', -- 'initiated', 'label_created', 'in_transit', 'received', 'inspecting', 'approved', 'rejected', 'refunded'

  -- Status tracking
  label_created_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  received_at_warehouse_at TIMESTAMP WITH TIME ZONE,
  inspected_at TIMESTAMP WITH TIME ZONE,
  refunded_at TIMESTAMP WITH TIME ZONE,

  -- Rejection (if applicable)
  rejection_reason TEXT,
  rejected_at TIMESTAMP WITH TIME ZONE,

  -- Sync tracking
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_returns_user ON returns(user_id);
CREATE INDEX idx_returns_order ON returns(order_id);
CREATE INDEX idx_returns_store ON returns(store_id);
CREATE INDEX idx_returns_status ON returns(return_status);
CREATE INDEX idx_returns_refund_status ON returns(refund_status);
CREATE INDEX idx_returns_store_return_id ON returns(store_return_id);

-- =============================================================================
-- RETURN ITEMS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS return_items (
  id SERIAL PRIMARY KEY,
  return_id INT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  order_item_id INT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,

  -- Item details
  product_id INT,
  quantity INT NOT NULL CHECK (quantity > 0),

  -- Pricing
  item_price_cents INT NOT NULL,
  refund_amount_cents INT NOT NULL, -- May be different if partial refund

  -- Item condition (after inspection)
  condition_rating VARCHAR(50), -- 'new', 'like_new', 'good', 'damaged', 'defective'
  condition_notes TEXT,

  -- Status
  item_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  rejection_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_return_items_return ON return_items(return_id);
CREATE INDEX idx_return_items_order_item ON return_items(order_item_id);

-- =============================================================================
-- RETURN STATUS HISTORY
-- =============================================================================
CREATE TABLE IF NOT EXISTS return_status_history (
  id SERIAL PRIMARY KEY,
  return_id INT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,

  -- Status change
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,

  -- Details
  notes TEXT,
  changed_by VARCHAR(50), -- 'system', 'retailer', 'customer_service'

  -- Tracking info (if status = 'in_transit')
  tracking_location VARCHAR(255),
  tracking_timestamp TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_return_status_history_return ON return_status_history(return_id);
CREATE INDEX idx_return_status_history_created ON return_status_history(created_at);

-- =============================================================================
-- UPDATE ORDER ITEMS TABLE
-- =============================================================================
-- Track which items are returned
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_returned BOOLEAN DEFAULT false;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS returned_quantity INT DEFAULT 0;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS return_id INT;

-- Add FK to products only if products table exists and constraint missing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'return_items' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'return_items_product_id_fkey'
    ) THEN
      ALTER TABLE return_items
        ADD CONSTRAINT return_items_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id);
    END IF;
  END IF;
END$$;

-- Add FK to order_items return_id only if constraint missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'order_items' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'order_items_return_id_fkey'
  ) THEN
    ALTER TABLE order_items
      ADD CONSTRAINT order_items_return_id_fkey
      FOREIGN KEY (return_id) REFERENCES returns(id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_order_items_return ON order_items(return_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS returns_updated_at_trigger ON returns;
CREATE TRIGGER returns_updated_at_trigger
BEFORE UPDATE ON returns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS return_items_updated_at_trigger ON return_items;
CREATE TRIGGER return_items_updated_at_trigger
BEFORE UPDATE ON return_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Automatically create status history on return status change
CREATE OR REPLACE FUNCTION create_return_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.return_status IS DISTINCT FROM NEW.return_status) THEN
    INSERT INTO return_status_history (return_id, old_status, new_status, changed_by)
    VALUES (NEW.id, OLD.return_status, NEW.return_status, 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS returns_status_change_trigger ON returns;
CREATE TRIGGER returns_status_change_trigger
AFTER UPDATE ON returns
FOR EACH ROW
EXECUTE FUNCTION create_return_status_history();

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

GRANT ALL PRIVILEGES ON TABLE returns TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE return_items TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE return_status_history TO muse_admin;

GRANT USAGE, SELECT ON SEQUENCE returns_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE return_items_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE return_status_history_id_seq TO muse_admin;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE returns IS 'Returns initiated via retailer APIs';
COMMENT ON COLUMN returns.store_return_id IS 'Retailer internal return ID (source of truth)';
COMMENT ON COLUMN returns.return_status IS 'Current status of return in retailer system';
COMMENT ON COLUMN returns.refund_status IS 'Current status of refund processing';

COMMENT ON TABLE return_items IS 'Individual items included in a return';
COMMENT ON TABLE return_status_history IS 'Audit trail of return status changes';
