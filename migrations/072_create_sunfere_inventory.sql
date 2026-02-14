-- Migration: Create Sunfere Inventory Tracking System
-- Purpose: Academic research tracking of Sunfere fashion inventory

CREATE TABLE IF NOT EXISTS sunfere_products (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) UNIQUE NOT NULL, -- Sunfere's product ID
  product_name TEXT NOT NULL,
  brand_name VARCHAR(255),
  current_price DECIMAL(10, 2),
  original_price DECIMAL(10, 2),
  discount_percentage INTEGER,
  product_url TEXT,
  image_url TEXT,
  is_in_stock BOOLEAN DEFAULT true,
  category VARCHAR(255),
  subcategory VARCHAR(255),
  average_rating DECIMAL(3, 2),
  review_count INTEGER DEFAULT 0,

  -- First seen and last updated tracking
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Metadata
  raw_data JSONB, -- Store full scraped data for analysis
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sunfere_product_variants (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES sunfere_products(product_id) ON DELETE CASCADE,
  variant_id VARCHAR(255) UNIQUE NOT NULL, -- Sunfere's variant/SKU ID
  size VARCHAR(50),
  color VARCHAR(100),
  is_in_stock BOOLEAN DEFAULT true,
  sku VARCHAR(255),

  -- Tracking
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(product_id, variant_id)
);

CREATE TABLE IF NOT EXISTS sunfere_product_reviews (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES sunfere_products(product_id) ON DELETE CASCADE,
  review_id VARCHAR(255) UNIQUE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_title TEXT,
  review_text TEXT,
  reviewer_name VARCHAR(255),
  review_date DATE,
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory snapshot history for tracking changes over time
CREATE TABLE IF NOT EXISTS sunfere_inventory_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  total_products INTEGER,
  in_stock_products INTEGER,
  out_of_stock_products INTEGER,
  new_products_added INTEGER,
  products_removed INTEGER,
  average_price DECIMAL(10, 2),
  scrape_duration_seconds INTEGER,
  scrape_status VARCHAR(50), -- 'success', 'partial', 'failed'
  error_log TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(snapshot_date)
);

-- Price history tracking
CREATE TABLE IF NOT EXISTS sunfere_price_history (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES sunfere_products(product_id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  was_on_sale BOOLEAN DEFAULT false,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sunfere_products_brand ON sunfere_products(brand_name);
CREATE INDEX IF NOT EXISTS idx_sunfere_products_stock ON sunfere_products(is_in_stock);
CREATE INDEX IF NOT EXISTS idx_sunfere_products_category ON sunfere_products(category);
CREATE INDEX IF NOT EXISTS idx_sunfere_products_last_scraped ON sunfere_products(last_scraped_at);
CREATE INDEX IF NOT EXISTS idx_sunfere_variants_stock ON sunfere_product_variants(is_in_stock);
CREATE INDEX IF NOT EXISTS idx_sunfere_reviews_product ON sunfere_product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_sunfere_price_history_product ON sunfere_price_history(product_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_sunfere_snapshots_date ON sunfere_inventory_snapshots(snapshot_date DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sunfere_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sunfere_products_updated_at
  BEFORE UPDATE ON sunfere_products
  FOR EACH ROW
  EXECUTE FUNCTION update_sunfere_updated_at();

CREATE TRIGGER trigger_sunfere_variants_updated_at
  BEFORE UPDATE ON sunfere_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_sunfere_updated_at();

CREATE TRIGGER trigger_sunfere_reviews_updated_at
  BEFORE UPDATE ON sunfere_product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_sunfere_updated_at();
