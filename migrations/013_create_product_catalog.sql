-- =====================================================
-- DISCOVER PHASE: Product Catalog Infrastructure
-- =====================================================
-- Purpose: Store product data from affiliate networks
-- Strategy: JAR (batch) updates + SERVICE (real-time) lookups
-- =====================================================

-- =====================================================
-- 1. Product Catalog (Batch Updated)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_catalog (
    id SERIAL PRIMARY KEY,

    -- Identifiers
    external_product_id VARCHAR(255) NOT NULL,  -- Store's product ID
    store_id INTEGER NOT NULL REFERENCES stores(id),
    brand_id INTEGER REFERENCES brands(id),

    -- Basic Info (from batch import)
    product_name TEXT NOT NULL,
    product_description TEXT,
    category VARCHAR(100),
    sub_category VARCHAR(100),

    -- Pricing (batch updated daily)
    price_cents INTEGER,                    -- Base price in cents
    original_price_cents INTEGER,           -- MSRP/original price
    currency VARCHAR(3) DEFAULT 'USD',

    -- Availability (batch updated)
    is_available BOOLEAN DEFAULT true,
    stock_status VARCHAR(50),               -- 'in_stock', 'low_stock', 'out_of_stock'

    -- Media
    primary_image_url TEXT,
    additional_images JSONB,                -- Array of image URLs

    -- Metadata
    product_url TEXT NOT NULL,              -- Store's product page
    affiliate_link TEXT,                    -- Affiliate tracking link
    metadata JSONB,                         -- Sizes, colors, materials, etc.

    -- Tracking
    last_batch_update TIMESTAMP,            -- When JAR last updated this
    last_realtime_check TIMESTAMP,          -- When SERVICE last checked this
    batch_update_count INTEGER DEFAULT 0,
    realtime_check_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    UNIQUE(external_product_id, store_id)
);

-- Indexes for performance
CREATE INDEX idx_product_catalog_store ON product_catalog(store_id);
CREATE INDEX idx_product_catalog_brand ON product_catalog(brand_id);
CREATE INDEX idx_product_catalog_available ON product_catalog(is_available) WHERE is_available = true;
CREATE INDEX idx_product_catalog_category ON product_catalog(category);
CREATE INDEX idx_product_catalog_price ON product_catalog(price_cents);
CREATE INDEX idx_product_catalog_last_batch ON product_catalog(last_batch_update);
CREATE INDEX idx_product_catalog_external_id ON product_catalog(external_product_id);

COMMENT ON TABLE product_catalog IS 'Product catalog updated by batch JAR jobs';
COMMENT ON COLUMN product_catalog.last_batch_update IS 'Last time JAR updated this product';
COMMENT ON COLUMN product_catalog.last_realtime_check IS 'Last time SERVICE fetched real-time data';

-- =====================================================
-- 2. Product Price History (Track Price Changes)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_price_history (
    id SERIAL PRIMARY KEY,
    product_catalog_id INTEGER NOT NULL REFERENCES product_catalog(id) ON DELETE CASCADE,

    price_cents INTEGER NOT NULL,
    original_price_cents INTEGER,

    -- Track source of update
    update_source VARCHAR(20) NOT NULL,     -- 'batch_jar' or 'realtime_service'

    detected_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT check_update_source CHECK (update_source IN ('batch_jar', 'realtime_service'))
);

CREATE INDEX idx_price_history_product ON product_price_history(product_catalog_id);
CREATE INDEX idx_price_history_detected ON product_price_history(detected_at);

COMMENT ON TABLE product_price_history IS 'Track price changes over time for drop alerts';

-- =====================================================
-- 3. Product Realtime Cache (Cost Optimization)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_realtime_cache (
    id SERIAL PRIMARY KEY,
    product_catalog_id INTEGER NOT NULL REFERENCES product_catalog(id) ON DELETE CASCADE,

    -- Fresh data from affiliate API
    current_price_cents INTEGER NOT NULL,
    is_available BOOLEAN NOT NULL,
    available_variants JSONB,               -- Sizes, colors in stock right now
    shipping_info JSONB,
    promotions JSONB,                       -- Active discounts

    -- Cache metadata
    fetched_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,          -- When to refetch (e.g., 15 min TTL)
    api_call_cost_cents INTEGER DEFAULT 0,  -- Track cost per call

    UNIQUE(product_catalog_id)
);

CREATE INDEX idx_realtime_cache_expires ON product_realtime_cache(expires_at);
CREATE INDEX idx_realtime_cache_product ON product_realtime_cache(product_catalog_id);

COMMENT ON TABLE product_realtime_cache IS 'Cache real-time API calls to reduce costs';
COMMENT ON COLUMN product_realtime_cache.expires_at IS 'TTL: refetch if expired and user requests';

-- =====================================================
-- 4. Batch Import Logs (JAR Monitoring)
-- =====================================================
CREATE TABLE IF NOT EXISTS batch_import_logs (
    id SERIAL PRIMARY KEY,

    store_id INTEGER REFERENCES stores(id),

    -- Job info
    job_type VARCHAR(50) NOT NULL,          -- 'full_catalog', 'incremental', 'price_update'
    status VARCHAR(20) NOT NULL,            -- 'running', 'completed', 'failed'

    -- Stats
    products_processed INTEGER DEFAULT 0,
    products_created INTEGER DEFAULT 0,
    products_updated INTEGER DEFAULT 0,
    products_failed INTEGER DEFAULT 0,

    -- Timing
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    duration_seconds INTEGER,

    -- Error handling
    error_message TEXT,
    error_details JSONB,

    CONSTRAINT check_status CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX idx_batch_logs_store ON batch_import_logs(store_id);
CREATE INDEX idx_batch_logs_status ON batch_import_logs(status);
CREATE INDEX idx_batch_logs_started ON batch_import_logs(started_at DESC);

COMMENT ON TABLE batch_import_logs IS 'Monitor JAR batch import jobs';

-- =====================================================
-- 5. API Call Tracking (Cost Management)
-- =====================================================
CREATE TABLE IF NOT EXISTS api_call_tracking (
    id SERIAL PRIMARY KEY,

    store_id INTEGER REFERENCES stores(id),

    -- Call details
    api_type VARCHAR(50) NOT NULL,          -- 'batch_import', 'realtime_lookup', 'deep_link'
    endpoint VARCHAR(255),

    -- Cost tracking
    call_count INTEGER DEFAULT 1,
    estimated_cost_cents INTEGER DEFAULT 0,

    -- Response
    response_status INTEGER,                -- HTTP status code
    response_time_ms INTEGER,

    called_at TIMESTAMP DEFAULT NOW(),
    date DATE GENERATED ALWAYS AS (called_at::DATE) STORED
);

CREATE INDEX idx_api_tracking_store ON api_call_tracking(store_id);
CREATE INDEX idx_api_tracking_type ON api_call_tracking(api_type);
CREATE INDEX idx_api_tracking_date ON api_call_tracking(date);

COMMENT ON TABLE api_call_tracking IS 'Track API usage and costs';

-- =====================================================
-- 6. Product User Interactions (Track Popularity)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_user_interactions (
    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_catalog_id INTEGER NOT NULL REFERENCES product_catalog(id) ON DELETE CASCADE,

    interaction_type VARCHAR(50) NOT NULL,  -- 'view', 'click', 'save', 'cart_add', 'purchase'

    -- Trigger real-time refresh on high-value interactions
    triggered_realtime_fetch BOOLEAN DEFAULT false,

    interacted_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT check_interaction_type CHECK (
        interaction_type IN ('view', 'click', 'save', 'cart_add', 'purchase')
    )
);

CREATE INDEX idx_product_interactions_user ON product_user_interactions(user_id);
CREATE INDEX idx_product_interactions_product ON product_user_interactions(product_catalog_id);
CREATE INDEX idx_product_interactions_type ON product_user_interactions(interaction_type);
CREATE INDEX idx_product_interactions_date ON product_user_interactions(interacted_at DESC);

COMMENT ON TABLE product_user_interactions IS 'Track user product interactions and trigger real-time updates';

-- =====================================================
-- Row-Level Security (RLS)
-- =====================================================

-- Product catalog is public (read-only for all users)
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_catalog_select ON product_catalog FOR SELECT TO authenticated USING (true);

-- User interactions are private
ALTER TABLE product_user_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_interactions_select ON product_user_interactions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
CREATE POLICY product_interactions_insert ON product_user_interactions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- =====================================================
-- Triggers
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_catalog_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_catalog_timestamp
    BEFORE UPDATE ON product_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_product_catalog_timestamp();

-- Track price changes
CREATE OR REPLACE FUNCTION track_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.price_cents IS DISTINCT FROM OLD.price_cents) THEN
        INSERT INTO product_price_history (
            product_catalog_id,
            price_cents,
            original_price_cents,
            update_source
        ) VALUES (
            NEW.id,
            NEW.price_cents,
            NEW.original_price_cents,
            CASE
                WHEN NEW.last_realtime_check > OLD.last_realtime_check THEN 'realtime_service'
                ELSE 'batch_jar'
            END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_price_change
    AFTER UPDATE ON product_catalog
    FOR EACH ROW
    EXECUTE FUNCTION track_price_change();

-- =====================================================
-- Grant Permissions
-- =====================================================

GRANT SELECT ON product_catalog TO authenticated;
GRANT SELECT ON product_price_history TO authenticated;
GRANT SELECT, INSERT ON product_user_interactions TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
