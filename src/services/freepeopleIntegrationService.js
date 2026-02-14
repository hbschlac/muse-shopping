/**
 * Free People Integration Service
 * Syncs Free People inventory data with main Muse items catalog
 */

const pool = require('../db/pool');
const logger = require('../config/logger');

class FreepeopleIntegrationService {
  /**
   * Sync Free People products to main items table
   * Creates/updates items with store_id for Free People
   */
  async syncFreepeopleToItems() {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      logger.info('[FreePeople Integration] Starting sync to items table');

      // Get or create Free People store
      const storeResult = await client.query(`
        INSERT INTO stores (name, website_url, logo_url, is_active)
        VALUES ('Free People', 'https://www.freepeople.com',
                'https://www.freepeople.com/images/logo.svg', true)
        ON CONFLICT (name) DO UPDATE SET is_active = true
        RETURNING id
      `);

      const freepeopleStoreId = storeResult.rows[0].id;
      logger.info(`[FreePeople Integration] Using store_id: ${freepeopleStoreId}`);

      // Sync products from freepeople_products to items
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
          fp.product_id as external_product_id,
          fp.product_name as name,
          b.id as brand_id,
          COALESCE(fp.category, 'Clothing') as category,
          fp.subcategory,
          (fp.current_price * 100)::INTEGER as price_cents,
          (fp.original_price * 100)::INTEGER as original_price_cents,
          fp.product_url,
          fp.image_url as primary_image_url,
          fp.is_in_stock as is_active,
          fp.is_in_stock as is_available,
          jsonb_build_object(
            'rating', fp.average_rating,
            'review_count', fp.review_count,
            'is_on_sale', fp.is_on_sale,
            'sale_percentage', fp.sale_percentage,
            'available_colors', fp.available_colors,
            'available_sizes', fp.available_sizes,
            'source', 'freepeople_inventory'
          ) as metadata
        FROM freepeople_products fp
        LEFT JOIN brands b ON LOWER(b.name) = LOWER(fp.brand_name)
        WHERE fp.current_price IS NOT NULL
          AND fp.product_url IS NOT NULL
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
      `, [freepeopleStoreId]);

      const itemsCreated = syncResult.rowCount;

      await client.query('COMMIT');

      logger.info(`[FreePeople Integration] Sync complete. Items created/updated: ${itemsCreated}`);

      return {
        success: true,
        storeId: freepeopleStoreId,
        itemsCreated
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[FreePeople Integration] Sync failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update prices for existing items from latest Free People scrape
   */
  async updatePricesFromLatestScrape() {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE items i
        SET
          price_cents = (fp.current_price * 100)::INTEGER,
          original_price_cents = (fp.original_price * 100)::INTEGER,
          is_active = fp.is_in_stock,
          is_available = fp.is_in_stock,
          metadata = metadata || jsonb_build_object(
            'is_on_sale', fp.is_on_sale,
            'sale_percentage', fp.sale_percentage,
            'last_price_update', NOW()
          ),
          updated_at = NOW()
        FROM freepeople_products fp, stores s
        WHERE i.store_id = s.id
          AND s.name = 'Free People'
          AND i.external_product_id = fp.product_id
          AND fp.current_price IS NOT NULL
        RETURNING i.id
      `);

      logger.info(`[FreePeople Integration] Updated prices for ${result.rowCount} items`);

      return {
        success: true,
        itemsUpdated: result.rowCount
      };

    } catch (error) {
      logger.error('[FreePeople Integration] Price update failed:', error);
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
        WHERE s.name = 'Free People'
        GROUP BY s.id, s.name
      `);

      const freepeopleStats = await client.query(`
        SELECT
          COUNT(*) as total_products,
          COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock,
          AVG(current_price) as avg_price
        FROM freepeople_products
      `);

      return {
        integration: stats.rows[0] || {},
        source: freepeopleStats.rows[0] || {}
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get Free People products for a specific brand
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
        WHERE s.name = 'Free People'
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
   * Get Free People items for user's newsfeed (based on followed brands)
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
        WHERE s.name = 'Free People'
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

module.exports = new FreepeopleIntegrationService();
