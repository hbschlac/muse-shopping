-- Migration: Create cart system tables
-- Creates: cart_items table for multi-store shopping cart

-- Cart items table - stores products from multiple stores in unified cart
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  brand_id INT REFERENCES brands(id) ON DELETE SET NULL,

  -- Product details
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  product_url TEXT NOT NULL,
  product_image_url TEXT,
  product_description TEXT,

  -- Pricing
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  original_price_cents INT CHECK (original_price_cents >= 0), -- For showing discounts
  currency VARCHAR(3) DEFAULT 'USD',

  -- Variant details
  size VARCHAR(50),
  color VARCHAR(50),
  quantity INT DEFAULT 1 CHECK (quantity > 0),

  -- Availability
  in_stock BOOLEAN DEFAULT true,
  last_stock_check TIMESTAMP,

  -- Metadata
  metadata JSONB DEFAULT '{}', -- For store-specific data, affiliate tracking, etc.

  -- Timestamps
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure same product variant isn't added twice
  UNIQUE(user_id, store_id, product_sku, size, color)
);

-- Indexes for performance
CREATE INDEX idx_cart_user ON cart_items(user_id);
CREATE INDEX idx_cart_store ON cart_items(store_id);
CREATE INDEX idx_cart_brand ON cart_items(brand_id);
CREATE INDEX idx_cart_updated ON cart_items(updated_at);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cart_items_updated_at_trigger
BEFORE UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION update_cart_items_updated_at();

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE cart_items TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE cart_items_id_seq TO muse_admin;

-- Comments for documentation
COMMENT ON TABLE cart_items IS 'Shopping cart items from multiple stores for unified checkout';
COMMENT ON COLUMN cart_items.product_sku IS 'Store-specific product SKU for identifying unique products';
COMMENT ON COLUMN cart_items.price_cents IS 'Current price in cents at time of adding to cart';
COMMENT ON COLUMN cart_items.original_price_cents IS 'Original price before discount for showing savings';
COMMENT ON COLUMN cart_items.metadata IS 'Additional product data, affiliate tracking, or store-specific info';
