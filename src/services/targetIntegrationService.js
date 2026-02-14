/**
 * Target Integration Service
 * Syncs Target inventory data with main Muse items catalog
 */

const pool = require('../db/pool');
const logger = require('../config/logger');

class TargetIntegrationService {
  /**
   * Sync Target products to main items table
   * Creates/updates items with store_id for Target
   */
  async syncTargetToItems() {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      logger.info('[Target Integration] Starting sync to items table');

      // Get or create Target store
      const storeResult = await client.query(`
        INSERT INTO stores (name, website_url, logo_url, is_active)
        VALUES ('Target', 'https://www.target.com',
                'https://www.target.com/images/logo.svg', true)
        ON CONFLICT (name) DO UPDATE SET is_active = true
        RETURNING id
      `);

      const targetStoreId = storeResult.rows[0].id;
      logger.info(`[Target Integration] Using store_id: ${targetStoreId}`);

      // Sync products from target_products to items
      const syncResult = await client.query(`
        INSERT INTO items (
          store_id,
          external_product_id,
          name,
          brand_id,
          category,
          subcategory,
          price_cents,
          original_price_cents,
          product_url,
          primary_image_url,
          is_active,
          is_available,
          metadata
        )
        SELECT
          $1 as store_id,
          tp.product_id as external_product_id,
          tp.product_name as name,
          b.id as brand_id,
          COALESCE(tp.category, 'Clothing') as category,
          tp.subcategory,
          (tp.current_price * 100)::INTEGER as price_cents,
          (tp.original_price * 100)::INTEGER as original_price_cents,
          tp.product_url,
          tp.image_url as primary_image_url,
          tp.is_in_stock as is_active,
          tp.is_in_stock as is_available,
          jsonb_build_object(
            'rating', tp.average_rating,
            'review_count', tp.review_count,
            'is_on_sale', tp.is_on_sale,
            'sale_percentage', tp.sale_percentage,
            'available_colors', tp.available_colors,
            'available_sizes', tp.available_sizes,
            'source', 'target_inventory'
          ) as metadata
        FROM target_products tp
        LEFT JOIN brands b ON LOWER(b.name) = LOWER(tp.brand_name)
        WHERE tp.current_price IS NOT NULL
          AND tp.product_url IS NOT NULL
        ON CONFLICT (store_id, external_product_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          brand_id = EXCLUDED.brand_id,
          category = EXCLUDED.category,
          subcategory = EXCLUDED.subcategory,
          price_cents = EXCLUDED.price_cents,
          original_price_cents = EXCLUDED.original_price_cents,
          product_url = EXCLUDED.product_url,
          primary_image_url = EXCLUDED.primary_image_url,
          is_active = EXCLUDED.is_active,
          is_available = EXCLUDED.is_available,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id
      `, [targetStoreId]);

      const itemsCreated = syncResult.rowCount;

      await client.query('COMMIT');

      logger.info(`[Target Integration] Sync complete. Items created/updated: ${itemsCreated}`);

      return {
        success: true,
        storeId: targetStoreId,
        itemsCreated
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[Target Integration] Sync failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update prices for existing items from latest Target scrape
   */
  async updatePricesFromLatestScrape() {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE items i
        SET
          price_cents = (tp.current_price * 100)::INTEGER,
          original_price_cents = (tp.original_price * 100)::INTEGER,
          is_active = tp.is_in_stock,
          is_available = tp.is_in_stock,
          metadata = metadata || jsonb_build_object(
            'is_on_sale', tp.is_on_sale,
            'sale_percentage', tp.sale_percentage,
            'last_price_update', NOW()
          ),
          updated_at = NOW()
        FROM target_products tp, stores s
        WHERE i.store_id = s.id
          AND s.name = 'Target'
          AND i.external_product_id = tp.product_id
          AND tp.current_price IS NOT NULL
        RETURNING i.id
      `);

      logger.info(`[Target Integration] Updated prices for ${result.rowCount} items`);

      return {
        success: true,
        itemsUpdated: result.rowCount
      };

    } catch (error) {
      logger.error('[Target Integration] Price update failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get integration statistics
   */
  async getIntegrationStats() {
    const client = await pool.connect();

    try {
      const stats = await client.query(`
        SELECT
          s.id as store_id,
          s.name as store_name,
          COUNT(i.id) as total_items,
          COUNT(i.id) FILTER (WHERE i.is_active = true) as active_items,
          AVG(i.price_cents / 100.0) as avg_price,
          COUNT(DISTINCT i.brand_id) as total_brands,
          MAX(i.updated_at) as last_sync_at
        FROM stores s
        LEFT JOIN items i ON i.store_id = s.id
        WHERE s.name = 'Target'
        GROUP BY s.id, s.name
      `);

      const targetStats = await client.query(`
        SELECT
          COUNT(*) as total_products,
          COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock,
          AVG(current_price) as avg_price
        FROM target_products
      `);

      return {
        integration: stats.rows[0] || {},
        source: targetStats.rows[0] || {}
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get Target products for a specific brand
   */
  async getProductsByBrand(brandName) {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT
          i.id,
          i.name,
          i.price_cents / 100.0 as price,
          i.original_price_cents / 100.0 as original_price,
          i.primary_image_url,
          i.product_url,
          i.is_active,
          b.name as brand_name,
          i.metadata
        FROM items i
        JOIN stores s ON i.store_id = s.id
        JOIN brands b ON i.brand_id = b.id
        WHERE s.name = 'Target'
          AND LOWER(b.name) = LOWER($1)
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
   * Get Target items for user's newsfeed (based on followed brands)
   */
  async getNewsfeedItems(userId, limit = 20, offset = 0) {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT
          i.id,
          i.name,
          i.price_cents / 100.0 as price,
          i.original_price_cents / 100.0 as original_price,
          i.primary_image_url,
          i.product_url,
          i.category,
          i.subcategory,
          b.name as brand_name,
          i.metadata,
          i.created_at
        FROM items i
        JOIN stores s ON i.store_id = s.id
        JOIN brands b ON i.brand_id = b.id
        JOIN user_brand_follows ubf ON ubf.brand_id = b.id
        WHERE s.name = 'Target'
          AND ubf.user_id = $1
          AND i.is_active = true
        ORDER BY i.created_at DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);

      return result.rows;

    } finally {
      client.release();
    }
  }
}

module.exports = new TargetIntegrationService();
