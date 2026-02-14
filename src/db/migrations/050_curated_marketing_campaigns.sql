-- Migration: Curated Marketing Campaigns
-- Purpose: Enable organic marketing campaigns with curated content for filling blank tiles
-- Difference from sponsored content: No budget/billing, internal marketing initiatives

-- Main curated campaigns table
CREATE TABLE IF NOT EXISTS curated_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Campaign identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN (
        'seasonal_collection',
        'trend_spotlight',
        'style_edit',
        'new_arrivals',
        'sale_promotion',
        'brand_story',
        'gift_guide',
        'occasion_based',
        'editorial'
    )),

    -- Status and lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft',
        'scheduled',
        'active',
        'paused',
        'completed',
        'archived'
    )),

    -- Timing
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,

    -- Placement configuration
    placement_slot VARCHAR(50) NOT NULL CHECK (placement_slot IN (
        'homepage_hero',
        'newsfeed_top',
        'newsfeed_position_3',
        'newsfeed_position_5',
        'newsfeed_position_8',
        'stories_carousel',
        'category_hero',
        'search_hero'
    )),
    priority INTEGER DEFAULT 100, -- Higher = more important

    -- Creative assets
    hero_image_url TEXT,
    thumbnail_url TEXT,
    background_color VARCHAR(7), -- Hex color
    text_color VARCHAR(7),

    -- Campaign copy
    headline VARCHAR(200),
    subheadline VARCHAR(300),
    call_to_action VARCHAR(100),
    cta_url TEXT,

    -- Targeting (JSONB for flexibility)
    target_audience JSONB DEFAULT '{}', -- {genders: [], age_ranges: [], styles: []}
    geographic_targeting JSONB DEFAULT '{}', -- {countries: [], regions: []}

    -- Display rules
    max_impressions_per_user INTEGER DEFAULT NULL, -- Frequency cap
    show_to_new_users_only BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for common queries
    CONSTRAINT valid_date_range CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at)
);

CREATE INDEX idx_curated_campaigns_status ON curated_campaigns(status);
CREATE INDEX idx_curated_campaigns_placement ON curated_campaigns(placement_slot);
CREATE INDEX idx_curated_campaigns_dates ON curated_campaigns(starts_at, ends_at);
CREATE INDEX idx_curated_campaigns_active ON curated_campaigns(status, starts_at, ends_at)
    WHERE status = 'active';

-- Items featured in curated campaigns
CREATE TABLE IF NOT EXISTS curated_campaign_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES curated_campaigns(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,

    -- Item positioning
    position INTEGER, -- Order within the campaign tile/carousel

    -- Optional overrides for this specific campaign context
    custom_title VARCHAR(255),
    custom_description TEXT,
    custom_image_url TEXT,

    -- Metadata
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER REFERENCES users(id),

    UNIQUE(campaign_id, item_id)
);

CREATE INDEX idx_curated_campaign_items_campaign ON curated_campaign_items(campaign_id);
CREATE INDEX idx_curated_campaign_items_position ON curated_campaign_items(campaign_id, position);

-- Collections: Reusable item groups that can be referenced by multiple campaigns
CREATE TABLE IF NOT EXISTS curated_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Collection type
    collection_type VARCHAR(50) CHECK (collection_type IN (
        'manual', -- Hand-picked items
        'algorithmic', -- Auto-generated based on rules
        'hybrid' -- Mix of manual + algorithmic
    )),

    -- Algorithmic rules (if applicable)
    selection_rules JSONB DEFAULT '{}', -- {categories: [], brands: [], attributes: [], price_range: {}}
    max_items INTEGER DEFAULT 20,

    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_curated_collections_type ON curated_collections(collection_type);
CREATE INDEX idx_curated_collections_active ON curated_collections(is_active);

-- Items in collections
CREATE TABLE IF NOT EXISTS curated_collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES curated_collections(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,

    position INTEGER,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(collection_id, item_id)
);

CREATE INDEX idx_curated_collection_items_collection ON curated_collection_items(collection_id);

-- Link campaigns to collections (many-to-many)
CREATE TABLE IF NOT EXISTS curated_campaign_collections (
    campaign_id UUID NOT NULL REFERENCES curated_campaigns(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES curated_collections(id) ON DELETE CASCADE,

    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (campaign_id, collection_id)
);

-- Analytics: Track campaign performance
CREATE TABLE IF NOT EXISTS curated_campaign_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES curated_campaigns(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Context
    placement_shown VARCHAR(50),
    device_type VARCHAR(20),
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    view_duration_seconds INTEGER, -- How long was it visible

    -- Session info
    session_id UUID
);

CREATE INDEX idx_curated_impressions_campaign ON curated_campaign_impressions(campaign_id);
CREATE INDEX idx_curated_impressions_user ON curated_campaign_impressions(user_id);
CREATE INDEX idx_curated_impressions_date ON curated_campaign_impressions(viewed_at);

CREATE TABLE IF NOT EXISTS curated_campaign_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES curated_campaigns(id) ON DELETE CASCADE,
    impression_id UUID REFERENCES curated_campaign_impressions(id),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- What was clicked
    clicked_item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    click_type VARCHAR(50) CHECK (click_type IN (
        'hero_cta',
        'item_card',
        'view_all',
        'brand_link',
        'category_link'
    )),

    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_id UUID
);

CREATE INDEX idx_curated_clicks_campaign ON curated_campaign_clicks(campaign_id);
CREATE INDEX idx_curated_clicks_item ON curated_campaign_clicks(clicked_item_id);

CREATE TABLE IF NOT EXISTS curated_campaign_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES curated_campaigns(id) ON DELETE CASCADE,
    click_id UUID REFERENCES curated_campaign_clicks(id),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Conversion details
    conversion_type VARCHAR(50) CHECK (conversion_type IN (
        'add_to_cart',
        'favorite',
        'purchase',
        'follow_brand'
    )),
    item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
    conversion_value DECIMAL(10, 2), -- Purchase amount if applicable

    converted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    time_to_conversion_seconds INTEGER
);

CREATE INDEX idx_curated_conversions_campaign ON curated_campaign_conversions(campaign_id);
CREATE INDEX idx_curated_conversions_type ON curated_campaign_conversions(conversion_type);

-- Frequency capping: Track how many times users have seen each campaign
CREATE TABLE IF NOT EXISTS user_curated_campaign_frequency (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES curated_campaigns(id) ON DELETE CASCADE,

    impression_count INTEGER DEFAULT 0,
    last_shown_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, campaign_id)
);

CREATE INDEX idx_user_curated_frequency_campaign ON user_curated_campaign_frequency(campaign_id);

-- View: Active campaigns eligible for display
CREATE OR REPLACE VIEW active_curated_campaigns AS
SELECT
    c.*,
    COUNT(DISTINCT cci.item_id) as item_count,
    COUNT(DISTINCT ccc.collection_id) as collection_count
FROM curated_campaigns c
LEFT JOIN curated_campaign_items cci ON c.id = cci.campaign_id
LEFT JOIN curated_campaign_collections ccc ON c.id = ccc.campaign_id
WHERE
    c.status = 'active'
    AND (c.starts_at IS NULL OR c.starts_at <= CURRENT_TIMESTAMP)
    AND (c.ends_at IS NULL OR c.ends_at > CURRENT_TIMESTAMP)
GROUP BY c.id;

-- View: Campaign performance summary
CREATE OR REPLACE VIEW curated_campaign_performance AS
SELECT
    c.id as campaign_id,
    c.name,
    c.campaign_type,
    c.placement_slot,
    c.starts_at,
    c.ends_at,
    COUNT(DISTINCT i.id) as total_impressions,
    COUNT(DISTINCT i.user_id) as unique_users_reached,
    COUNT(DISTINCT cl.id) as total_clicks,
    COUNT(DISTINCT cv.id) as total_conversions,
    COALESCE(SUM(cv.conversion_value), 0) as total_conversion_value,
    CASE
        WHEN COUNT(DISTINCT i.id) > 0
        THEN ROUND((COUNT(DISTINCT cl.id)::NUMERIC / COUNT(DISTINCT i.id) * 100), 2)
        ELSE 0
    END as ctr_percentage,
    CASE
        WHEN COUNT(DISTINCT cl.id) > 0
        THEN ROUND((COUNT(DISTINCT cv.id)::NUMERIC / COUNT(DISTINCT cl.id) * 100), 2)
        ELSE 0
    END as conversion_rate_percentage
FROM curated_campaigns c
LEFT JOIN curated_campaign_impressions i ON c.id = i.campaign_id
LEFT JOIN curated_campaign_clicks cl ON c.id = cl.campaign_id
LEFT JOIN curated_campaign_conversions cv ON c.id = cv.campaign_id
GROUP BY c.id, c.name, c.campaign_type, c.placement_slot, c.starts_at, c.ends_at;

-- Function: Get eligible curated campaigns for a user and placement
CREATE OR REPLACE FUNCTION get_eligible_curated_campaigns(
    p_user_id INTEGER,
    p_placement_slot VARCHAR(50),
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
    campaign_id UUID,
    name VARCHAR(255),
    campaign_type VARCHAR(50),
    priority INTEGER,
    hero_image_url TEXT,
    headline VARCHAR(200),
    subheadline VARCHAR(300)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        c.campaign_type,
        c.priority,
        c.hero_image_url,
        c.headline,
        c.subheadline
    FROM curated_campaigns c
    LEFT JOIN user_curated_campaign_frequency f
        ON c.id = f.campaign_id AND f.user_id = p_user_id
    WHERE
        c.status = 'active'
        AND c.placement_slot = p_placement_slot
        AND (c.starts_at IS NULL OR c.starts_at <= CURRENT_TIMESTAMP)
        AND (c.ends_at IS NULL OR c.ends_at > CURRENT_TIMESTAMP)
        -- Frequency cap check
        AND (c.max_impressions_per_user IS NULL
             OR f.impression_count IS NULL
             OR f.impression_count < c.max_impressions_per_user)
        -- New users only check
        AND (c.show_to_new_users_only = FALSE
             OR (SELECT created_at FROM users WHERE id = p_user_id) > CURRENT_TIMESTAMP - INTERVAL '7 days')
    ORDER BY
        c.priority DESC,
        RANDOM() -- Randomize among same priority
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function: Get items for a curated campaign (with personalization support)
CREATE OR REPLACE FUNCTION get_curated_campaign_items(
    p_campaign_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    item_id INTEGER,
    "position" INTEGER,
    custom_title VARCHAR(255),
    custom_description TEXT,
    custom_image_url TEXT,
    item_name VARCHAR(255),
    brand_name VARCHAR(255),
    price DECIMAL(10, 2),
    sale_price DECIMAL(10, 2),
    image_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cci.item_id,
        cci.position,
        cci.custom_title,
        cci.custom_description,
        cci.custom_image_url,
        i.name,
        i.brand,
        il.price,
        il.sale_price,
        i.images->0->>'url' as image_url
    FROM curated_campaign_items cci
    JOIN items i ON cci.item_id = i.id
    LEFT JOIN LATERAL (
        SELECT price, sale_price
        FROM item_listings
        WHERE item_id = i.id
        AND is_available = TRUE
        ORDER BY
            CASE WHEN sale_price IS NOT NULL THEN sale_price ELSE price END ASC
        LIMIT 1
    ) il ON TRUE
    WHERE cci.campaign_id = p_campaign_id
    ORDER BY cci.position ASC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_curated_campaign_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_curated_campaign_updated_at
    BEFORE UPDATE ON curated_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_curated_campaign_updated_at();

CREATE TRIGGER trigger_update_curated_collection_updated_at
    BEFORE UPDATE ON curated_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_curated_campaign_updated_at();
