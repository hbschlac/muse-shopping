/**
 * Nordstrom Integration Service
 * Syncs Nordstrom products into the main Muse items catalog
 * Enables Nordstrom products to appear when users follow brands
 */

const pool = require('../db/pool');
const logger = require('../config/logger');

class NordstromIntegrationService {

  /**
   * Sync Nordstrom products into the main items table
   * Maps Nordstrom data to Muse item structure
   */
  async syncNordstromToItems() {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      logger.info('[Nordstrom Integration] Starting sync to items table');

      // First, ensure we have a "Nordstrom" store
      const storeResult = await client.query(`
        INSERT INTO stores (name, slug, website_url, logo_url, integration_type, is_active)
        VALUES ('Nordstrom', 'nordstrom', 'https://www.nordstrom.com', 'https://www.nordstrom.com/logo.png', 'redirect', true)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          website_url = EXCLUDED.website_url
        RETURNING id
      `);
      const nordstromStoreId = storeResult.rows[0].id;

      logger.info(`[Nordstrom Integration] Nordstrom store ID: ${nordstromStoreId}`);

      // Sync products to items table
      // This maps Nordstrom products to your existing item structure
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

          np.product_id as external_product_id,

          -- Try to match existing brand, or null if not found
          (SELECT id FROM brands WHERE LOWER(name) = LOWER(
            CASE
              WHEN np.brand_name ~ '^\$' THEN
                -- Extract brand from product name if brand field has price
                SPLIT_PART(np.product_name, ' ', 1)
              ELSE
                np.brand_name
            END
          ) LIMIT 1) as brand_id,

          np.product_name as canonical_name,

          np.product_name as name,

          np.product_name as description,

          COALESCE(np.category, 'Clothing') as category,

          np.subcategory as subcategory,

          'women' as gender,

          np.image_url as primary_image_url,

          np.image_url as image_url,

          np.product_url as product_url,

          (np.current_price * 100)::integer as price_cents,

          (COALESCE(np.original_price, np.current_price) * 100)::integer as original_price_cents,

          np.is_in_stock as is_active,

          np.is_in_stock as is_available

        FROM nordstrom_products np
        WHERE np.product_id NOT LIKE 'SAMPLE-%'
        AND np.product_name IS NOT NULL
        AND np.current_price IS NOT NULL

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
      `, [nordstromStoreId]);

      const itemsCreated = syncResult.rowCount;
      logger.info(`[Nordstrom Integration] Synced ${itemsCreated} products to items table`);

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
          np.product_id as external_product_id,
          $1 as store_id,
          i.brand_id,
          np.product_name as product_name,
          COALESCE(np.category, 'Clothing') as category,
          np.subcategory,
          (np.current_price * 100)::integer as price_cents,
          (COALESCE(np.original_price, np.current_price) * 100)::integer as original_price_cents,
          np.is_in_stock as is_available,
          np.image_url as primary_image_url,
          np.product_url as product_url,
          jsonb_build_object(
            'source', 'nordstrom',
            'nordstrom_product_id', np.product_id,
            'average_rating', np.average_rating,
            'review_count', np.review_count
          ) as metadata
        FROM nordstrom_products np
        LEFT JOIN items i ON i.external_product_id = np.product_id AND i.store_id = $1
        WHERE np.product_id NOT LIKE 'SAMPLE-%'
        AND np.product_name IS NOT NULL
        AND np.current_price IS NOT NULL

        ON CONFLICT (external_product_id, store_id)
        DO UPDATE SET
          product_name = EXCLUDED.product_name,
          price_cents = EXCLUDED.price_cents,
          original_price_cents = EXCLUDED.original_price_cents,
          is_available = EXCLUDED.is_available,
          primary_image_url = EXCLUDED.primary_image_url,
          product_url = EXCLUDED.product_url,
          updated_at = NOW()
      `, [nordstromStoreId]);

      logger.info(`[Nordstrom Integration] Synced ${catalogResult.rowCount} products to product_catalog table`);

      await client.query('COMMIT');

      return {
        success: true,
        itemsCreated,
        catalogCreated: catalogResult.rowCount,
        storeId: nordstromStoreId
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[Nordstrom Integration] Sync failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get Nordstrom products for a specific brand
   */
  async getNordstromItemsForBrand(brandName) {
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
          i.metadata->>'nordstrom_url' as product_url,
          i.metadata->>'average_rating' as rating,
          i.metadata->>'review_count' as reviews
        FROM items i
        JOIN brands b ON i.brand_id = b.id
        WHERE LOWER(b.name) = LOWER($1)
        AND i.metadata->>'source' = 'nordstrom'
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
   * Get all Nordstrom items for newsfeed
   */
  async getNordstromItemsForNewsfeed(userId, limit = 20) {
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
          i.metadata->>'nordstrom_url' as product_url,
          i.metadata->>'average_rating' as rating,
          i.metadata->>'review_count' as reviews,
          i.created_at
        FROM items i
        JOIN brands b ON i.brand_id = b.id
        JOIN user_brand_affinities uba ON uba.brand_id = b.id
        WHERE uba.user_id = $1
        AND i.metadata->>'source' = 'nordstrom'
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
   * Update Nordstrom item prices from latest scrape
   */
  async updatePricesFromNordstrom() {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE items i
        SET
          base_price = np.current_price,
          is_active = np.is_in_stock,
          metadata = i.metadata || jsonb_build_object(
            'last_price_update', NOW(),
            'price_changed', (i.base_price != np.current_price)
          ),
          updated_at = NOW()
        FROM nordstrom_products np
        WHERE i.metadata->>'nordstrom_product_id' = np.product_id
        AND i.metadata->>'source' = 'nordstrom'
        RETURNING i.id
      `);

      logger.info(`[Nordstrom Integration] Updated ${result.rowCount} item prices`);

      return {
        success: true,
        updatedCount: result.rowCount
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get statistics on Nordstrom integration
   */
  async getIntegrationStats() {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE metadata->>'source' = 'nordstrom') as nordstrom_items,
          COUNT(DISTINCT brand_id) FILTER (WHERE metadata->>'source' = 'nordstrom') as nordstrom_brands,
          AVG(base_price) FILTER (WHERE metadata->>'source' = 'nordstrom') as avg_price,
          COUNT(*) FILTER (WHERE metadata->>'source' = 'nordstrom' AND is_active = true) as active_items
        FROM items
      `);

      return result.rows[0];

    } finally {
      client.release();
    }
  }
}

module.exports = new NordstromIntegrationService();
