-- Migration 067: Add performance indexes for latency optimization
-- Purpose: Improve query performance for frequently accessed tables

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION _muse_safe_exec(sql_text TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_text;
EXCEPTION
  WHEN undefined_table OR undefined_column OR undefined_object OR invalid_parameter_value THEN
    RAISE NOTICE 'Skipping statement due to schema mismatch: %', sql_text;
END;
$$ LANGUAGE plpgsql;

SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_items_brand_id_active ON items(brand_id) WHERE is_active = TRUE');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_items_category_active ON items(category) WHERE is_active = TRUE');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_items_subcategory_active ON items(subcategory) WHERE is_active = TRUE');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_items_brand_category_active ON items(brand_id, category) WHERE is_active = TRUE');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_items_created_at_desc ON items(created_at DESC) WHERE is_active = TRUE');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_items_canonical_name_trgm ON items USING gin(canonical_name gin_trgm_ops)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_items_description_trgm ON items USING gin(description gin_trgm_ops)');

SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_item_listings_item_id_in_stock ON item_listings(item_id) WHERE in_stock = TRUE');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_item_listings_item_id_price ON item_listings(item_id, price)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_item_listings_sale_price ON item_listings(item_id, sale_price) WHERE sale_price IS NOT NULL');

SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id_updated ON chat_sessions(user_id, updated_at DESC)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_chat_sessions_title_trgm ON chat_sessions USING gin(title gin_trgm_ops)');

SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at DESC)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_chat_messages_content_trgm ON chat_messages USING gin(content gin_trgm_ops)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_chat_messages_role_created ON chat_messages(role, created_at DESC)');

SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_brand_affinity_user_id ON brand_affinity(user_id)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_user_item_interactions_user_type_created ON user_item_interactions(user_id, interaction_type, created_at DESC)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id_created ON cart_items(cart_id, created_at DESC)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_orders_user_id_created ON orders(user_id, created_at DESC)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_product_catalog_last_realtime_check ON product_catalog(last_realtime_check)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_product_catalog_store_available ON product_catalog(store_id, is_available)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_product_realtime_cache_expires ON product_realtime_cache(expires_at)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_api_call_tracking_called_at ON api_call_tracking(called_at DESC)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_api_call_tracking_store_type ON api_call_tracking(store_id, api_type, called_at DESC)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_product_user_interactions_interacted ON product_user_interactions(interacted_at DESC)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_product_user_interactions_user_type ON product_user_interactions(user_id, interaction_type, interacted_at DESC)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_style_profiles_user_id_updated ON style_profiles(user_id, updated_at DESC)');
SELECT _muse_safe_exec('CREATE INDEX IF NOT EXISTS idx_chat_retrieval_logs_session ON chat_retrieval_logs(session_id, created_at DESC)');

SELECT _muse_safe_exec('ANALYZE items');
SELECT _muse_safe_exec('ANALYZE item_listings');
SELECT _muse_safe_exec('ANALYZE chat_sessions');
SELECT _muse_safe_exec('ANALYZE chat_messages');
SELECT _muse_safe_exec('ANALYZE user_preferences');
SELECT _muse_safe_exec('ANALYZE brand_affinity');
SELECT _muse_safe_exec('ANALYZE user_item_interactions');
SELECT _muse_safe_exec('ANALYZE cart_items');
SELECT _muse_safe_exec('ANALYZE orders');
SELECT _muse_safe_exec('ANALYZE product_catalog');
SELECT _muse_safe_exec('ANALYZE product_realtime_cache');
SELECT _muse_safe_exec('ANALYZE api_call_tracking');
SELECT _muse_safe_exec('ANALYZE product_user_interactions');
SELECT _muse_safe_exec('ANALYZE style_profiles');
SELECT _muse_safe_exec('ANALYZE chat_retrieval_logs');

DROP FUNCTION IF EXISTS _muse_safe_exec(TEXT);
