/**
 * Sunfere Integration Service
 * Syncs Sunfere products into the main Muse items catalog
 * Enables Sunfere products to appear when users follow brands
 */

const pool = require('../db/pool');
const logger = require('../config/logger');

class SunfereIntegrationService {

  /**
   * Sync Sunfere products into the main items table
   * Maps Sunfere data to Muse item structure
   */
  async syncSunfereToItems() {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      logger.info('[Sunfere Integration] Starting sync to items table');

      // First, ensure we have a "Sunfere" store
      const storeResult = await client.query(`
        INSERT INTO stores (name, slug, website_url, logo_url, integration_type, is_active)
        VALUES ('Sunfere', 'sunfere', 'https://sunfere.com', 'https://sunfere.com/logo.png', 'redirect', true)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          website_url = EXCLUDED.website_url
        RETURNING id
      `);
      const sunfereStoreId = storeResult.rows[0].id;

      logger.info(`[Sunfere Integration] Sunfere store ID: ${sunfereStoreId}`);

      // Sync products to items table
      // This maps Sunfere products to your existing item structure
      const syncResult = await client.query(`
        INSERT INTO items (
          store_id,
          external_product_id,
          brand_id,
          canonical_name,
          name,
          description,
          category,
          subcategory,
          gender,
          primary_image_url,
          image_url,
          product_url,
          price_cents,
          original_price_cents,
          is_active,
          is_available
        )
        SELECT
          $1 as store_id,

          sp.product_id as external_product_id,

          -- Try to match existing brand, or null if not found
          (SELECT id FROM brands WHERE LOWER(name) = LOWER(sp.brand_name) LIMIT 1) as brand_id,

          sp.product_name as canonical_name,

          sp.product_name as name,

          sp.product_name as description,

          COALESCE(sp.category, 'Clothing') as category,

          sp.subcategory as subcategory,

          'women' as gender,

          sp.image_url as primary_image_url,

          sp.image_url as image_url,

          sp.product_url as product_url,

          (sp.current_price * 100)::integer as price_cents,

          (COALESCE(sp.original_price, sp.current_price) * 100)::integer as original_price_cents,

          sp.is_in_stock as is_active,

          sp.is_in_stock as is_available

        FROM sunfere_products sp
        WHERE sp.product_id NOT LIKE 'SAMPLE-%'
        AND sp.product_name IS NOT NULL
        AND sp.current_price IS NOT NULL

        ON CONFLICT (store_id, external_product_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          canonical_name = EXCLUDED.canonical_name,
          primary_image_url = EXCLUDED.primary_image_url,
          image_url = EXCLUDED.image_url,
          product_url = EXCLUDED.product_url,
          price_cents = EXCLUDED.price_cents,
          original_price_cents = EXCLUDED.original_price_cents,
          is_active = EXCLUDED.is_active,
          is_available = EXCLUDED.is_available,
          updated_at = NOW()

        RETURNING id
      `, [sunfereStoreId]);

      const itemsCreated = syncResult.rowCount;
      logger.info(`[Sunfere Integration] Synced ${itemsCreated} products to items table`);

      // Also sync to product_catalog table for PDP/realtime service
      const catalogResult = await client.query(`
        INSERT INTO product_catalog (
          external_product_id,
          store_id,
          brand_id,
          product_name,
          category,
          subcategory,
          price_cents,
          original_price_cents,
          is_available,
          primary_image_url,
          product_url,
          metadata
        )
        SELECT
          sp.product_id as external_product_id,
          $1 as store_id,
          i.brand_id,
          sp.product_name as product_name,
          COALESCE(sp.category, 'Clothing') as category,
          sp.subcategory,
          (sp.current_price * 100)::integer as price_cents,
          (COALESCE(sp.original_price, sp.current_price) * 100)::integer as original_price_cents,
          sp.is_in_stock as is_available,
          sp.image_url as primary_image_url,
          sp.product_url as product_url,
          jsonb_build_object(
            'source', 'sunfere',
            'sunfere_product_id', sp.product_id,
            'average_rating', sp.average_rating,
            'review_count', sp.review_count
          ) as metadata
        FROM sunfere_products sp
        LEFT JOIN items i ON i.external_product_id = sp.product_id AND i.store_id = $1
        WHERE sp.product_id NOT LIKE 'SAMPLE-%'
        AND sp.product_name IS NOT NULL
        AND sp.current_price IS NOT NULL

        ON CONFLICT (external_product_id, store_id)
        DO UPDATE SET
          product_name = EXCLUDED.product_name,
          price_cents = EXCLUDED.price_cents,
          original_price_cents = EXCLUDED.original_price_cents,
          is_available = EXCLUDED.is_available,
          primary_image_url = EXCLUDED.primary_image_url,
          product_url = EXCLUDED.product_url,
          updated_at = NOW()
      `, [sunfereStoreId]);

      logger.info(`[Sunfere Integration] Synced ${catalogResult.rowCount} products to product_catalog table`);

      await client.query('COMMIT');

      return {
        success: true,
        itemsCreated,
        catalogCreated: catalogResult.rowCount,
        storeId: sunfereStoreId
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[Sunfere Integration] Sync failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get Sunfere products for a specific brand
   */
  async getSunfereItemsForBrand(brandName) {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT
          i.id,
          i.canonical_name,
          i.primary_image_url,
          i.base_price,
          i.category,
          i.subcategory,
          i.metadata->>'sunfere_url' as product_url,
          i.metadata->>'average_rating' as rating,
          i.metadata->>'review_count' as reviews
        FROM items i
        JOIN brands b ON i.brand_id = b.id
        WHERE LOWER(b.name) = LOWER($1)
        AND i.metadata->>'source' = 'sunfere'
        AND i.is_active = true
        ORDER BY i.created_at DESC
        LIMIT 50
      `, [brandName]);

      return result.rows;

    } finally {
      client.release();
    }
  }

  /**
   * Get all Sunfere items for newsfeed
   */
  async getSunfereItemsForNewsfeed(userId, limit = 20) {
    const client = await pool.connect();

    try {
      // Get brands the user follows
      const result = await client.query(`
        SELECT
          i.id,
          i.canonical_name,
          b.name as brand_name,
          b.logo_url as brand_logo,
          i.primary_image_url,
          i.base_price,
          i.category,
          i.subcategory,
          i.metadata->>'sunfere_url' as product_url,
          i.metadata->>'average_rating' as rating,
          i.metadata->>'review_count' as reviews,
          i.created_at
        FROM items i
        JOIN brands b ON i.brand_id = b.id
        JOIN user_brand_affinities uba ON uba.brand_id = b.id
        WHERE uba.user_id = $1
        AND i.metadata->>'source' = 'sunfere'
        AND i.is_active = true
        ORDER BY i.created_at DESC
        LIMIT $2
      `, [userId, limit]);

      return result.rows;

    } finally {
      client.release();
    }
  }

  /**
   * Update Sunfere item prices from latest scrape
   */
  async updatePricesFromSunfere() {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE items i
        SET
          base_price = sp.current_price,
          is_active = sp.is_in_stock,
          metadata = i.metadata || jsonb_build_object(
            'last_price_update', NOW(),
            'price_changed', (i.base_price != sp.current_price)
          ),
          updated_at = NOW()
        FROM sunfere_products sp
        WHERE i.metadata->>'sunfere_product_id' = sp.product_id
        AND i.metadata->>'source' = 'sunfere'
        RETURNING i.id
      `);

      logger.info(`[Sunfere Integration] Updated ${result.rowCount} item prices`);

      return {
        success: true,
        updatedCount: result.rowCount
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get statistics on Sunfere integration
   */
  async getIntegrationStats() {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE metadata->>'source' = 'sunfere') as sunfere_items,
          COUNT(DISTINCT brand_id) FILTER (WHERE metadata->>'source' = 'sunfere') as sunfere_brands,
          AVG(base_price) FILTER (WHERE metadata->>'source' = 'sunfere') as avg_price,
          COUNT(*) FILTER (WHERE metadata->>'source' = 'sunfere' AND is_active = true) as active_items
        FROM items
      `);

      return result.rows[0];

    } finally {
      client.release();
    }
  }
}

module.exports = new SunfereIntegrationService();
