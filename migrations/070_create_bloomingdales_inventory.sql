/**
 * Bloomingdales Inventory System - Database Schema
 * Tracks women's clothing inventory from Bloomingdales for academic research
 */

-- Main products table
CREATE TABLE IF NOT EXISTS bloomingdales_products (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  brand_name VARCHAR(255),
  current_price DECIMAL(10, 2),
  original_price DECIMAL(10, 2),
  discount_percentage INTEGER,

  -- Images
  image_url TEXT,
  additional_images JSONB DEFAULT '[]',

  -- Product details
  description TEXT,
  category VARCHAR(255),
  subcategory VARCHAR(255),

  -- Availability
  is_in_stock BOOLEAN DEFAULT true,
  stock_status VARCHAR(50),

  -- Ratings & Reviews
  average_rating DECIMAL(3, 2),
  review_count INTEGER DEFAULT 0,

  -- External links
  product_url TEXT NOT NULL,

  -- Metadata
  last_scraped_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Product variants (sizes, colors)
CREATE TABLE IF NOT EXISTS bloomingdales_product_variants (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES bloomingdales_products(product_id) ON DELETE CASCADE,
  variant_type VARCHAR(50) NOT NULL, -- 'size', 'color', etc.
  variant_value VARCHAR(255) NOT NULL,
  sku VARCHAR(255),
  is_available BOOLEAN DEFAULT true,
  price_adjustment DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Product reviews
CREATE TABLE IF NOT EXISTS bloomingdales_product_reviews (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES bloomingdales_products(product_id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  reviewer_name VARCHAR(255),
  review_date DATE,
  verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory snapshots for historical tracking
CREATE TABLE IF NOT EXISTS bloomingdales_inventory_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  total_products INTEGER,
  in_stock_products INTEGER,
  out_of_stock_products INTEGER,
  average_price DECIMAL(10, 2),
  category_breakdown JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Price history tracking
CREATE TABLE IF NOT EXISTS bloomingdales_price_history (
  id SERIAL PRIMARY KEY,
  product_id VARCHAR(255) REFERENCES bloomingdales_products(product_id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  original_price DECIMAL(10, 2),
  discount_percentage INTEGER,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bloomingdales_products_brand ON bloomingdales_products(brand_name);
CREATE INDEX IF NOT EXISTS idx_bloomingdales_products_category ON bloomingdales_products(category);
CREATE INDEX IF NOT EXISTS idx_bloomingdales_products_price ON bloomingdales_products(current_price);
CREATE INDEX IF NOT EXISTS idx_bloomingdales_products_stock ON bloomingdales_products(is_in_stock);
CREATE INDEX IF NOT EXISTS idx_bloomingdales_variants_product ON bloomingdales_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_bloomingdales_reviews_product ON bloomingdales_product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_bloomingdales_price_history_product ON bloomingdales_price_history(product_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bloomingdales_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bloomingdales_products_timestamp
  BEFORE UPDATE ON bloomingdales_products
  FOR EACH ROW
  EXECUTE FUNCTION update_bloomingdales_products_updated_at();
