-- Default Brand Experience
-- Created: 2026-02-02
-- Purpose: Support default brand follows for new users with ability to dismiss/unfollow

-- =====================================================
-- ADD DEFAULT FOLLOW TRACKING
-- Track which follows are defaults vs user-selected
-- =====================================================

-- Add is_default column to user_brand_follows
ALTER TABLE user_brand_follows
ADD COLUMN is_default BOOLEAN DEFAULT false,
ADD COLUMN dismissed_at TIMESTAMP WITH TIME ZONE NULL;

-- Index for querying default follows
CREATE INDEX idx_user_brand_follows_default ON user_brand_follows(user_id, is_default)
WHERE is_default = true;

-- Index for active (not dismissed) follows
CREATE INDEX idx_user_brand_follows_active ON user_brand_follows(user_id)
WHERE dismissed_at IS NULL;

-- =====================================================
-- DEFAULT BRANDS TABLE
-- Curated list of brands to auto-follow for new users
-- =====================================================

CREATE TABLE default_brands (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint - each brand can only be default once
CREATE UNIQUE INDEX idx_default_brands_brand ON default_brands(brand_id)
WHERE is_active = true;

-- Index for priority ordering
CREATE INDEX idx_default_brands_priority ON default_brands(priority DESC, id)
WHERE is_active = true;

-- =====================================================
-- SEED DEFAULT BRANDS
-- Popular, diverse brands for new user experience
-- =====================================================

INSERT INTO default_brands (brand_id, priority, reason)
SELECT
    b.id,
    CASE b.name
        -- Top Priority (100+)
        WHEN 'Zara' THEN 100
        WHEN 'H&M' THEN 95
        WHEN 'Nike' THEN 90
        WHEN 'Lululemon' THEN 85
        WHEN 'Nordstrom' THEN 80

        -- High Priority (70-80)
        WHEN 'ASOS' THEN 75
        WHEN 'Madewell' THEN 72
        WHEN 'Everlane' THEN 70
        WHEN 'Uniqlo' THEN 68
        WHEN 'Target' THEN 65

        -- Medium Priority (50-60)
        WHEN 'Urban Outfitters' THEN 60
        WHEN 'Reformation' THEN 58
        WHEN 'Free People' THEN 55
        WHEN 'Anthropologie' THEN 52
        WHEN 'COS' THEN 50
    END,
    CASE b.name
        WHEN 'Zara' THEN 'Trendy, affordable fast fashion'
        WHEN 'H&M' THEN 'Budget-friendly fashion staples'
        WHEN 'Nike' THEN 'Popular athletic and streetwear'
        WHEN 'Lululemon' THEN 'Premium activewear favorite'
        WHEN 'Nordstrom' THEN 'Wide selection, all price points'
        WHEN 'ASOS' THEN 'Huge online selection'
        WHEN 'Madewell' THEN 'Quality denim and basics'
        WHEN 'Everlane' THEN 'Transparent, sustainable essentials'
        WHEN 'Uniqlo' THEN 'Japanese basics and tech wear'
        WHEN 'Target' THEN 'Affordable everyday fashion'
        WHEN 'Urban Outfitters' THEN 'Trendy lifestyle brand'
        WHEN 'Reformation' THEN 'Sustainable feminine styles'
        WHEN 'Free People' THEN 'Boho-chic favorites'
        WHEN 'Anthropologie' THEN 'Unique, artisan styles'
        WHEN 'COS' THEN 'Minimalist Scandinavian design'
    END
FROM brands b
WHERE b.name IN (
    'Zara', 'H&M', 'Nike', 'Lululemon', 'Nordstrom',
    'ASOS', 'Madewell', 'Everlane', 'Uniqlo', 'Target',
    'Urban Outfitters', 'Reformation', 'Free People',
    'Anthropologie', 'COS'
)
ON CONFLICT (brand_id) DO NOTHING;

-- =====================================================
-- FUNCTION: Auto-follow default brands for new user
-- =====================================================

CREATE OR REPLACE FUNCTION auto_follow_default_brands(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    follow_count INTEGER := 0;
BEGIN
    -- Insert default brand follows for the user
    INSERT INTO user_brand_follows (user_id, brand_id, is_default)
    SELECT
        p_user_id,
        db.brand_id,
        true
    FROM default_brands db
    WHERE db.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM user_brand_follows ubf
        WHERE ubf.user_id = p_user_id
        AND ubf.brand_id = db.brand_id
    )
    ORDER BY db.priority DESC, db.id
    LIMIT 10; -- Start with top 10 default brands

    GET DIAGNOSTICS follow_count = ROW_COUNT;

    RETURN follow_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE default_brands IS 'Curated brands to auto-follow for new users, ensuring immediate newsfeed content';
COMMENT ON COLUMN user_brand_follows.is_default IS 'True if this follow was auto-added as a default (not user-selected)';
COMMENT ON COLUMN user_brand_follows.dismissed_at IS 'When user dismissed/unfollowed this default brand';
COMMENT ON FUNCTION auto_follow_default_brands IS 'Auto-follows top default brands for a new user to ensure they have content';
