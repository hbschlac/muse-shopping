/**
 * Urban Outfitters Integration Service
 * Syncs Urban Outfitters inventory data with main Muse items catalog
 */

const pool = require('../db/pool');
const logger = require('../config/logger');

class UrbanOutfittersIntegrationService {
  /**
   * Sync Urban Outfitters products to main items table
   * Creates/updates items with store_id for Urban Outfitters
   */
  async syncUrbanOutfittersToItems() {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      logger.info('[Urban Outfitters Integration] Starting sync to items table');

      // Get or create Urban Outfitters store
      const storeResult = await client.query(`
        INSERT INTO stores (name, website_url, logo_url, is_active)
        VALUES ('Urban Outfitters', 'https://www.urbanoutfitters.com',
                'https://www.urbanoutfitters.com/images/logo.svg', true)
        ON CONFLICT (name) DO UPDATE SET is_active = true
        RETURNING id
      `);

      const urbanoutfittersStoreId = storeResult.rows[0].id;
      logger.info(`[Urban Outfitters Integration] Using store_id: ${urbanoutfittersStoreId}`);

      // Sync products from urbanoutfitters_products to items
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
          uop.product_id as external_product_id,
          uop.product_name as name,
          b.id as brand_id,
          COALESCE(uop.category, 'Clothing') as category,
          uop.subcategory,
          (uop.current_price * 100)::INTEGER as price_cents,
          (uop.original_price * 100)::INTEGER as original_price_cents,
          uop.product_url,
          uop.image_url as primary_image_url,
          uop.is_in_stock as is_active,
          uop.is_in_stock as is_available,
          jsonb_build_object(
            'rating', uop.average_rating,
            'review_count', uop.review_count,
            'is_on_sale', uop.is_on_sale,
            'sale_percentage', uop.sale_percentage,
            'available_colors', uop.available_colors,
            'available_sizes', uop.available_sizes,
            'source', 'urbanoutfitters_inventory'
          ) as metadata
        FROM urbanoutfitters_products uop
        LEFT JOIN brands b ON LOWER(b.name) = LOWER(uop.brand_name)
        WHERE uop.current_price IS NOT NULL
          AND uop.product_url IS NOT NULL
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
      `, [urbanoutfittersStoreId]);

      const itemsCreated = syncResult.rowCount;

      await client.query('COMMIT');

      logger.info(`[Urban Outfitters Integration] Sync complete. Items created/updated: ${itemsCreated}`);

      return {
        success: true,
        storeId: urbanoutfittersStoreId,
        itemsCreated
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('[Urban Outfitters Integration] Sync failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update prices for existing items from latest Urban Outfitters scrape
   */
  async updatePricesFromLatestScrape() {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        UPDATE items i
        SET
          price_cents = (uop.current_price * 100)::INTEGER,
          original_price_cents = (uop.original_price * 100)::INTEGER,
          is_active = uop.is_in_stock,
          is_available = uop.is_in_stock,
          metadata = metadata || jsonb_build_object(
            'is_on_sale', uop.is_on_sale,
            'sale_percentage', uop.sale_percentage,
            'last_price_update', NOW()
          ),
          updated_at = NOW()
        FROM urbanoutfitters_products uop, stores s
        WHERE i.store_id = s.id
          AND s.name = 'Urban Outfitters'
          AND i.external_product_id = uop.product_id
          AND uop.current_price IS NOT NULL
        RETURNING i.id
      `);

      logger.info(`[Urban Outfitters Integration] Updated prices for ${result.rowCount} items`);

      return {
        success: true,
        itemsUpdated: result.rowCount
      };

    } catch (error) {
      logger.error('[Urban Outfitters Integration] Price update failed:', error);
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
        WHERE s.name = 'Urban Outfitters'
        GROUP BY s.id, s.name
      `);

      const urbanoutfittersStats = await client.query(`
        SELECT
          COUNT(*) as total_products,
          COUNT(*) FILTER (WHERE is_in_stock = true) as in_stock,
          AVG(current_price) as avg_price
        FROM urbanoutfitters_products
      `);

      return {
        integration: stats.rows[0] || {},
        source: urbanoutfittersStats.rows[0] || {}
      };

    } finally {
      client.release();
    }
  }

  /**
   * Get Urban Outfitters products for a specific brand
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
        WHERE s.name = 'Urban Outfitters'
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
   * Get Urban Outfitters items for user's newsfeed (based on followed brands)
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
        WHERE s.name = 'Urban Outfitters'
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

module.exports = new UrbanOutfittersIntegrationService();
