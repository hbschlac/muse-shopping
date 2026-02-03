-- Add shopper profiles and product tracking
-- Migration: 009_add_shopper_profiles_and_products

-- Table: shopper_profiles
-- Stores analyzed shopping preferences from email scans
CREATE TABLE IF NOT EXISTS shopper_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Shopping preferences
  favorite_categories JSONB DEFAULT '{}', -- {"jeans": 5, "dress": 3}
  common_sizes JSONB DEFAULT '[]', -- ["M", "32/34", "8"]
  price_range JSONB DEFAULT '{}', -- {"min": 20, "max": 200, "avg": 85}

  -- Shopping behavior
  total_orders_analyzed INTEGER DEFAULT 0,
  total_items_purchased INTEGER DEFAULT 0,
  total_spent_cents INTEGER DEFAULT 0, -- Total in cents
  average_order_value_cents INTEGER DEFAULT 0,

  -- Interests (derived from purchases)
  interests JSONB DEFAULT '[]', -- [{"category": "activewear", "percentage": 35}]

  -- Metadata
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id)
);

CREATE INDEX idx_shopper_profiles_user_id ON shopper_profiles(user_id);
CREATE INDEX idx_shopper_profiles_interests ON shopper_profiles USING GIN(interests);

-- Table: order_products
-- Individual products extracted from order emails
CREATE TABLE IF NOT EXISTS order_products (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_scan_result_id INTEGER REFERENCES email_scan_results(id) ON DELETE SET NULL,

  -- Product details
  product_name VARCHAR(500),
  category VARCHAR(100), -- clothing, shoes, accessories, etc.
  size VARCHAR(50), -- M, L, 32/34, 8, etc.
  quantity INTEGER DEFAULT 1,
  price_cents INTEGER, -- Price in cents

  -- Brand/Store
  brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  brand_name VARCHAR(255), -- Denormalized for when brand_id is NULL

  -- Order context
  order_number VARCHAR(255),
  order_date TIMESTAMP WITH TIME ZONE,
  order_total_cents INTEGER, -- Total order amount

  -- Source
  email_subject TEXT,
  email_sender VARCHAR(255),
  gmail_message_id VARCHAR(255), -- Gmail message ID for reference

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_products_user_id ON order_products(user_id);
CREATE INDEX idx_order_products_brand_id ON order_products(brand_id);
CREATE INDEX idx_order_products_category ON order_products(category);
CREATE INDEX idx_order_products_order_date ON order_products(order_date DESC);
CREATE INDEX idx_order_products_scan_result_id ON order_products(email_scan_result_id);

-- Trigger to update shopper_profiles.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shopper_profiles_updated_at
  BEFORE UPDATE ON shopper_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE shopper_profiles TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE order_products TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE shopper_profiles_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE order_products_id_seq TO muse_admin;
