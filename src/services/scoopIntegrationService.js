/**
 * Scoop Integration Service
 * Connects Scoop inventory to Muse items catalog
 */

const pool = require('../db/pool');
const logger = require('../config/logger');

class ScoopIntegrationService {
  /**
   * Sync Scoop products to items and product_catalog tables
   * Store ID 127 for Scoop
   */
  async syncScoopToItems() {
    logger.info('[Scoop Integration] Starting sync to items table');

    const scoopStoreId = 127; // Scoop store ID

    try {
      // Get all Scoop products
      const productsResult = await pool.query(`
        SELECT
          product_id,
          product_name,
          brand_name,
          current_price,
          original_price,
          discount_percentage,
          image_url,
          product_url,
          category,
          subcategory,
          is_in_stock,
          description
        FROM scoop_products
        ORDER BY product_name
      `);

      logger.info(`[Scoop Integration] Found ${productsResult.rows.length} products to sync`);

      let itemsCreated = 0;
      let catalogCreated = 0;

      for (const product of productsResult.rows) {
        // Get or create brand
        let brandId = await this.getOrCreateBrand(product.brand_name);

        // Insert into items table (for newsfeed)
        const itemQuery = `
          INSERT INTO items (
            store_id,
            external_product_id,
            brand_id,
            name,
            canonical_name,
            description,
            category,
            subcategory,
            price_cents,
            original_price_cents,
            product_url,
            image_url,
            is_active,
            is_available
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (store_id, external_product_id)
          DO UPDATE SET
            name = EXCLUDED.name,
            price_cents = EXCLUDED.price_cents,
            image_url = EXCLUDED.image_url,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
          RETURNING id
        `;

        const itemValues = [
          scoopStoreId,
          product.product_id,
          brandId,
          product.product_name,
          product.product_name, // canonical_name
          product.description || `${product.product_name} from Scoop`,
          product.category || 'clothing',
          product.subcategory || 'apparel',
          Math.round((product.current_price || 0) * 100), // Convert to cents
          product.original_price ? Math.round(product.original_price * 100) : null,
          product.product_url,
          product.image_url,
          product.is_in_stock !== false, // active if in stock
          product.is_in_stock !== false  // available if in stock
        ];

        await pool.query(itemQuery, itemValues);
        itemsCreated++;

        // Insert into product_catalog table (for PDP)
        const catalogQuery = `
          INSERT INTO product_catalog (
            store_id,
            external_product_id,
            product_name,
            category,
            subcategory,
            price_cents,
            original_price_cents,
            primary_image_url,
            product_url,
            is_available
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (store_id, external_product_id)
          DO UPDATE SET
            product_name = EXCLUDED.product_name,
            price_cents = EXCLUDED.price_cents,
            primary_image_url = EXCLUDED.primary_image_url,
            is_available = EXCLUDED.is_available,
            updated_at = NOW()
          RETURNING id
        `;

        const catalogValues = [
          scoopStoreId,
          product.product_id,
          product.product_name,
          product.category || 'clothing',
          product.subcategory || 'apparel',
          Math.round((product.current_price || 0) * 100),
          product.original_price ? Math.round(product.original_price * 100) : null,
          product.image_url,
          product.product_url,
          product.is_in_stock !== false
        ];

        await pool.query(catalogQuery, catalogValues);
        catalogCreated++;
      }

      logger.info(`[Scoop Integration] Sync complete: ${itemsCreated} items, ${catalogCreated} catalog entries`);

      return {
        success: true,
        itemsCreated,
        catalogCreated,
        storeId: scoopStoreId
      };

    } catch (error) {
      logger.error('[Scoop Integration] Sync failed:', error);
      throw error;
    }
  }

  /**
   * Get or create brand by name
   */
  async getOrCreateBrand(brandName) {
    if (!brandName || brandName === 'Unknown Brand') {
      return null;
    }

    const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Try to find existing brand by slug or name
    const findQuery = 'SELECT id FROM brands WHERE slug = $1 OR name = $2 LIMIT 1';
    const findResult = await pool.query(findQuery, [slug, brandName]);

    if (findResult.rows.length > 0) {
      return findResult.rows[0].id;
    }

    // Create new brand (use ON CONFLICT DO NOTHING to handle races)
    const createQuery = `
      INSERT INTO brands (name, slug, is_active)
      VALUES ($1, $2, true)
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `;

    const createResult = await pool.query(createQuery, [brandName, slug]);

    // If conflict occurred, query again
    if (createResult.rows.length === 0) {
      const retryResult = await pool.query(findQuery, [slug, brandName]);
      return retryResult.rows[0]?.id || null;
    }

    return createResult.rows[0].id;
  }

  /**
   * Get Scoop items for newsfeed (based on user's followed brands)
   */
  async getScoopItemsForNewsfeed(userId, limit = 20) {
    const query = `
      SELECT
        i.id,
        i.name,
        i.image_url,
        i.price_cents,
        i.original_price_cents,
        i.product_url,
        b.name as brand_name,
        b.logo_url as brand_logo
      FROM items i
      JOIN brands b ON i.brand_id = b.id
      JOIN user_brand_affinities uba ON uba.brand_id = b.id
      WHERE uba.user_id = $1
        AND i.store_id = 11
        AND i.is_active = true
        AND i.is_available = true
      ORDER BY i.created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Get stats for integration
   */
  async getStats() {
    const query = `
      SELECT
        COUNT(*) as total_items,
        COUNT(DISTINCT brand_id) as total_brands,
        AVG(price_cents) as avg_price_cents
      FROM items
      WHERE store_id = 11
    `;

    const result = await pool.query(query);
    return result.rows[0];
  }
}

module.exports = new ScoopIntegrationService();
