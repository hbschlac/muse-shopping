/**
 * The Commense Integration Service
 * Syncs The Commense products into the main Muse items catalog
 * Enables The Commense products to appear when users follow brands
 */

const pool = require('../db/pool');
const logger = require('../config/logger');

class CommenseIntegrationService {

  /**
   * Sync The Commense products into the main items table
   * Maps The Commense data to Muse item structure
   */
  async syncCommenseToItems() {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      logger.info('[Commense Integration] Starting sync to items table');

      // First, ensure we have a "The Commense" store
      const storeResult = await client.query(`
        INSERT INTO stores (name, slug, website_url, logo_url, integration_type, is_active)
        VALUES ('The Commense', 'thecommense', 'https://thecommense.com', 'https://thecommense.com/logo.png', 'redirect', true)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          website_url = EXCLUDED.website_url
        RETURNING id
      `);
      const commenseStoreId = storeResult.rows[0].id;

      logger.info(`[Commense Integration] The Commense store ID: ${commenseStoreId}`);

      // Sync products to items table
      // This maps The Commense products to your existing item structure
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

          cp.product_id as external_product_id,

          -- Try to match existing brand, or null if not found
          (SELECT id FROM brands WHERE LOWER(name) = LOWER(cp.brand_name) LIMIT 1) as brand_id,

          cp.product_name as canonical_name,

          cp.product_name as name,

          cp.product_name as description,

          COALESCE(cp.category, 'Clothing') as category,

          cp.subcategory as subcategory,

          'women' as gender,

          cp.image_url as primary_image_url,

          cp.image_url as image_url,

          cp.product_url as product_url,

          (cp.current_price * 100)::integer as price_cents,

          (COALESCE(cp.original_price, cp.current_price) * 100)::integer as original_price_cents,

          cp.is_in_stock as is_active,

          cp.is_in_stock as is_available

        FROM commense_products cp
        WHERE cp.product_id NOT LIKE 'SAMPLE-%'
        AND cp.product_name IS NOT NULL
        AND cp.current_price IS NOT NULL

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
      `, [commenseStoreId]);

      const itemsCreated = syncResult.rowCount;
      logger.info(`[Commense Integration] Synced ${itemsCreated} products to items table`);

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
          cp.product_id as external_product_id,
          $1 as store_id,
          i.brand_id,
          cp.product_name as product_name,
          COALESCE(cp.category, 'Clothing') as category,
          cp.subcategory,
          (cp.current_price * 100)::integer as price_cents,
          (COALESCE(cp.original_price, cp.current_price) * 100)::integer as original_price_cents,
          cp.is_in_stock as is_available,
          cp.image_url as primary_image_url,
          cp.product_url as product_url,
          jsonb_build_object(
            'source', 'commense',
            'commense_product_id', cp.product_id,
            'average_rating', cp.average_rating,
            'review_count', cp.review_count
          ) as metadata
        FROM commense_products cp
        LEFT JOIN items i ON i.external_product_id = cp.product_id AND i.store_id = $1
        WHERE cp.product_id NOT LIKE 'SAMPLE-%'
        AND cp.product_name IS NOT NULL
        AND cp.current_price IS NOT NULL

        ON CONFLICT (external_product_id, store_id)
        DO UPDATE SET
          product_name = EXCLUDED.product_name,
          price_cents = EXCLUDED.price_cents,
          original_price_cents = EXCLUDED.original_price_cents,
          is_available = EXCLUDED.is_available,
          primary_image_url = EXCLUDED.primary_image_url,
          product_url = EXCLUDED.product_url,
          updated_at = NOW()
      `, [commenseStoreId]);

      logger.info(`[Commense Integration] Synced ${catalogResult.rowCount} products to product_catalog table`);

      await client.query('COMMIT');

      return {
        success: true,
        itemsCreated,
        catalogCreated: catalogResult.rowCount,
        storeId: commenseStoreId
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[Commense Integration] Sync failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get The Commense products for a specific brand
   */
  async getCommenseItemsForBrand(brandName) {
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
          i.metadata->>'commense_url' as product_url,
          i.metadata->>'average_rating' as rating,
          i.metadata->>'review_count' as reviews
        FROM items i
        JOIN brands b ON i.brand_id = b.id
        WHERE LOWER(b.name) = LOWER($1)
        AND i.metadata->>'source' = 'commense'
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
   * Get all The Commense items for newsfeed
   */
  async getCommenseItemsForNewsfeed(userId, limit = 20) {
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
          i.metadata->>'commense_url' as product_url,
          i.metadata->>'average_rating' as rating,
          i.metadata->>'review_count' as reviews,
          i.created_at
        FROM items i
        JOIN brands b ON i.brand_id = b.id
        JOIN user_brand_affinities uba ON uba.brand_id = b.id
        WHERE uba.user_id = $1
        AND i.metadata->>'source' = 'commense'
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
   * Update The Commense item prices from latest scrape
   */
  async updatePricesFromCommense() {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE items i
        SET
          base_price = cp.current_price,
          is_active = cp.is_in_stock,
          metadata = i.metadata || jsonb_build_object(
            'last_price_update', NOW(),
            'price_changed', (i.base_price != cp.current_price)
          ),
          updated_at = NOW()
        FROM commense_products cp
        WHERE i.metadata->>'commense_product_id' = cp.product_id
        AND i.metadata->>'source' = 'commense'
        RETURNING i.id
      `);

      logger.info(`[Commense Integration] Updated ${result.rowCount} item prices`);

      return {
        success: true,
        updatedCount: result.rowCount
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get statistics on The Commense integration
   */
  async getIntegrationStats() {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE metadata->>'source' = 'commense') as commense_items,
          COUNT(DISTINCT brand_id) FILTER (WHERE metadata->>'source' = 'commense') as commense_brands,
          AVG(base_price) FILTER (WHERE metadata->>'source' = 'commense') as avg_price,
          COUNT(*) FILTER (WHERE metadata->>'source' = 'commense' AND is_active = true) as active_items
        FROM items
      `);

      return result.rows[0];

    } finally {
      client.release();
    }
  }
}

module.exports = new CommenseIntegrationService();
