-- Migration: Enhance stores and brands tables for comprehensive retailer/brand integration
-- Based on research: 20 retailers, 1000+ brands with distribution mapping

-- Add API integration metadata to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS api_type VARCHAR(50), -- 'public_api', 'partner_api', 'affiliate', 'monitoring'
ADD COLUMN IF NOT EXISTS api_endpoint TEXT, -- Base API URL
ADD COLUMN IF NOT EXISTS api_docs_url TEXT, -- Documentation URL
ADD COLUMN IF NOT EXISTS requires_partnership BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS affiliate_program_url TEXT,
ADD COLUMN IF NOT EXISTS catalog_scale VARCHAR(20), -- 'very_high', 'high', 'medium'
ADD COLUMN IF NOT EXISTS priority VARCHAR(10), -- 'P0', 'P1', 'P2'
ADD COLUMN IF NOT EXISTS integration_notes TEXT,
ADD COLUMN IF NOT EXISTS supports_real_time_inventory BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS supports_price_api BOOLEAN DEFAULT false;

-- Update metadata column to be more structured
COMMENT ON COLUMN stores.api_type IS 'Type of API access: public_api, partner_api, affiliate, monitoring';
COMMENT ON COLUMN stores.priority IS 'Integration priority: P0 (critical), P1 (high), P2 (nice-to-have)';
COMMENT ON COLUMN stores.catalog_scale IS 'Size of product catalog: very_high (100k+), high (10k+), medium (1k+)';

-- Add brand distribution tracking
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS primary_retailers TEXT[], -- Array of store slugs where brand is sold
ADD COLUMN IF NOT EXISTS marketplace_presence TEXT[], -- Array of marketplace slugs (amazon, walmart, etc.)
ADD COLUMN IF NOT EXISTS category_focus VARCHAR(255), -- 'dresses,tops', 'shoes', etc.
ADD COLUMN IF NOT EXISTS priority_score INT DEFAULT 50, -- 0-100 priority for integration
ADD COLUMN IF NOT EXISTS distribution_status VARCHAR(20) DEFAULT 'unverified', -- 'unverified', 'verified', 'active'
ADD COLUMN IF NOT EXISTS region VARCHAR(50) DEFAULT 'US/Canada',
ADD COLUMN IF NOT EXISTS integration_phase VARCHAR(20); -- 'top100', 'top300', 'top1000', 'longtail'

COMMENT ON COLUMN brands.primary_retailers IS 'Array of store slugs where this brand is primarily sold';
COMMENT ON COLUMN brands.marketplace_presence IS 'Array of marketplace slugs where brand products appear';
COMMENT ON COLUMN brands.integration_phase IS 'Which phase of brand rollout: top100, top300, top1000, longtail';

-- Create brand-retailer relationship table for detailed mapping
CREATE TABLE IF NOT EXISTS brand_retailer_relationships (
  id SERIAL PRIMARY KEY,
  brand_id INT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  store_id INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- Relationship details
  relationship_type VARCHAR(50), -- 'primary', 'secondary', 'marketplace'
  has_dedicated_page BOOLEAN DEFAULT false,
  product_count_estimate INT,
  average_price_cents INT,

  -- Data access
  has_api_access BOOLEAN DEFAULT false,
  has_affiliate_feed BOOLEAN DEFAULT false,
  requires_scraping BOOLEAN DEFAULT false,

  -- Status
  is_active BOOLEAN DEFAULT true,
  verified_at TIMESTAMP,
  last_catalog_sync TIMESTAMP,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(brand_id, store_id)
);

CREATE INDEX idx_brand_retailer_brand ON brand_retailer_relationships(brand_id);
CREATE INDEX idx_brand_retailer_store ON brand_retailer_relationships(store_id);
CREATE INDEX idx_brand_retailer_active ON brand_retailer_relationships(is_active);

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE brand_retailer_relationships TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE brand_retailer_relationships_id_seq TO muse_admin;

-- Create integration queue table for tracking rollout
CREATE TABLE IF NOT EXISTS integration_queue (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(20), -- 'store' or 'brand'
  entity_id INT NOT NULL,
  entity_name VARCHAR(255) NOT NULL,

  -- Priority
  priority VARCHAR(10), -- 'P0', 'P1', 'P2'
  priority_score INT,

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'blocked'
  integration_phase VARCHAR(20), -- 'top100', 'top300', 'top1000'

  -- Progress tracking
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  blocked_reason TEXT,
  assigned_to VARCHAR(100),

  -- Metadata
  integration_notes TEXT,
  api_research_completed BOOLEAN DEFAULT false,
  test_account_created BOOLEAN DEFAULT false,
  catalog_imported BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_integration_queue_status ON integration_queue(status);
CREATE INDEX idx_integration_queue_priority ON integration_queue(priority, priority_score DESC);
CREATE INDEX idx_integration_queue_phase ON integration_queue(integration_phase);

GRANT ALL PRIVILEGES ON TABLE integration_queue TO muse_admin;
GRANT USAGE, SELECT ON SEQUENCE integration_queue_id_seq TO muse_admin;

COMMENT ON TABLE brand_retailer_relationships IS 'Maps which brands are sold at which retailers with access method details';
COMMENT ON TABLE integration_queue IS 'Tracks progress of integrating stores and brands into the platform';
