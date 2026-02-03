-- Migration: Enhance existing product catalog with variants and matching
-- Builds on existing product_catalog table from migration 013

-- Add missing columns to product_catalog for comprehensive tracking
ALTER TABLE product_catalog
ADD COLUMN IF NOT EXISTS slug VARCHAR(500),
ADD COLUMN IF NOT EXISTS short_description VARCHAR(1000),
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
ADD COLUMN IF NOT EXISTS product_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS colors TEXT[],
ADD COLUMN IF NOT EXISTS sizes TEXT[],
ADD COLUMN IF NOT EXISTS materials TEXT[],
ADD COLUMN IF NOT EXISTS care_instructions TEXT,
ADD COLUMN IF NOT EXISTS match_group_id INT,
ADD COLUMN IF NOT EXISTS match_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS sync_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'active';

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_product_catalog_slug ON product_catalog(slug);
CREATE INDEX IF NOT EXISTS idx_product_catalog_gender ON product_catalog(gender);
CREATE INDEX IF NOT EXISTS idx_product_catalog_match_group ON product_catalog(match_group_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_sync ON product_catalog(last_batch_update, sync_status);
CREATE INDEX IF NOT EXISTS idx_product_catalog_type ON product_catalog(product_type);

-- Create product variants table: Size/color combinations
CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  product_catalog_id INT NOT NULL REFERENCES product_catalog(id) ON DELETE CASCADE,

  -- Variant identification
  external_id VARCHAR(255),
  sku VARCHAR(255),

  -- Variant attributes
  size VARCHAR(50),
  color VARCHAR(100),

  -- Pricing (can differ from base product)
  price_cents INT,
  original_price_cents INT,
  is_on_sale BOOLEAN DEFAULT false,

  -- Inventory
  in_stock BOOLEAN DEFAULT true,
  inventory_count INT,

  -- Media
  image_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(product_catalog_id, size, color)
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_catalog_id);
CREATE INDEX IF NOT EXISTS idx_variants_stock ON product_variants(in_stock);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);

-- Product match groups: Groups same product across different retailers
CREATE TABLE IF NOT EXISTS product_match_groups (
  id SERIAL PRIMARY KEY,

  -- Match details
  canonical_name VARCHAR(500),
  canonical_brand_id INT REFERENCES brands(id),

  -- Categorization
  category VARCHAR(100),
  product_type VARCHAR(100),

  -- Match quality
  match_method VARCHAR(50), -- 'exact', 'fuzzy', 'manual', 'ml'
  confidence_score DECIMAL(3,2),

  -- Stats
  product_count INT DEFAULT 0,
  min_price_cents INT,
  max_price_cents INT,
  avg_price_cents INT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_match_groups_brand ON product_match_groups(canonical_brand_id);
CREATE INDEX IF NOT EXISTS idx_match_groups_category ON product_match_groups(category);

-- Catalog sync queue: Manages syncing products from retailers
CREATE TABLE IF NOT EXISTS catalog_sync_queue (
  id SERIAL PRIMARY KEY,

  -- Target
  store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'category', 'brand'

  -- Filters (for targeted syncs)
  category_filter VARCHAR(100),
  brand_filter VARCHAR(255),

  -- Priority
  priority INT DEFAULT 50, -- 0-100, higher = more urgent

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'

  -- Progress
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  products_synced INT DEFAULT 0,
  products_failed INT DEFAULT 0,

  -- Error handling
  error_message TEXT,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,

  -- Scheduling
  scheduled_for TIMESTAMP,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON catalog_sync_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_store ON catalog_sync_queue(store_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_scheduled ON catalog_sync_queue(scheduled_for) WHERE status = 'pending';

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE product_variants TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE product_match_groups TO muse_admin;
GRANT ALL PRIVILEGES ON TABLE catalog_sync_queue TO muse_admin;

GRANT USAGE, SELECT ON SEQUENCE product_variants_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE product_match_groups_id_seq TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE catalog_sync_queue_id_seq TO muse_admin;

-- Comments
COMMENT ON TABLE product_variants IS 'Size/color variants for products';
COMMENT ON TABLE product_match_groups IS 'Groups same product across different retailers for price comparison';
COMMENT ON TABLE catalog_sync_queue IS 'Queue for syncing product catalogs from retailers';
